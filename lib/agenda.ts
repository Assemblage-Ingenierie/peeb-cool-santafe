import { FASES, HITOS_FASE, esModeloEnvolvente, type ComponenteCode } from "@/lib/constants";
import { construirCartasPorFila, lineasHito, type RoadmapOverride } from "@/lib/roadmap";
import { computeSchedule, faseNodeKey, type Unidad } from "@/lib/schedule";
import { SEMESTRES_CODES, planGlobalEfectivo, type PlanStored } from "@/lib/semestres";
import type { Roadmap, Snapshot } from "@/lib/snapshot";

// ============================================================
// lib/agenda.ts — « Próximas tareas » de la hoja de ruta du projet global.
//
// Ne stocke RIEN : tout est recalculé à partir des cronogramas, avec le MÊME
// moteur (`computeSchedule`) que le Cronograma et les feuilles de route. Les
// dates de démarrage n'existent pas en base pour la plupart des tâches — elles
// se déduisent des ancres de phase, des durées et des liaisons.
//
// Principe : on prend la barre « hoy » du cronograma, puis
//   • les tâches qu'elle TRAVERSE      -> « en curso »
//   • celles qui DÉMARRENT ensuite     -> 15 jours / 1 mois / 2 mois
// Les fenêtres sont EXCLUSIVES : une tâche n'apparaît que dans la plus proche,
// sans quoi la dernière contiendrait tout et ne prioriserait plus rien.
// ============================================================

export type Ventana = "en_curso" | "d15" | "m1" | "m2";

export const VENTANAS: { key: Ventana; titulo: string }[] = [
  { key: "en_curso", titulo: "En curso" },
  { key: "d15", titulo: "Próximos 15 días" },
  { key: "m1", titulo: "Próximo mes" },
  { key: "m2", titulo: "Próximos 2 meses" },
];

export interface TareaAgenda {
  id: string; // unique toutes feuilles confondues (feuille + clé)
  nombre: string;
  componente: ComponenteCode | null; // null = démarrage de phase
  esFase: boolean;
  feuille: string; // "global" ou uid de sous-projet
  subproyecto: string; // libellé complet (info-bulle)
  sigla: string; // forme courte affichée (AIR, Cullen, N°67…)
  tipologia: string | null; // A | H | E ; null pour la feuille globale
  inicioMs: number;
  finMs: number;
}

export type Agenda = { key: Ventana; titulo: string; tareas: TareaAgenda[] }[];

type Datos = Snapshot & Roadmap;

const asUnidad = (u: string | null | undefined): Unidad | null =>
  u === "dia" || u === "semana" || u === "mes" ? u : null;

// Date ISO (YYYY-MM-DD) -> ms LOCAUX. Même conversion que le Cronograma pour sa
// barre « hoy » : comparer des instants parsés différemment décalerait les
// tâches d'un jour selon le fuseau.
function isoMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime() : null;
}

// Libellé d'une phase : phases principales et jalons partagent le même registre.
const NOMBRE_FASE = new Map<string, string>([
  ...FASES.map((f) => [f.code, f.nombre] as [string, string]),
  ...HITOS_FASE.map((h) => [h.code, h.nombre] as [string, string]),
]);

/** Calcule le planning d'UNE feuille (sous-projet ou global) et en tire les tâches. */
function tareasDeFeuille(datos: Datos, feuille: string): Omit<TareaAgenda, "subproyecto" | "sigla" | "tipologia">[] {
  const esGlobal = feuille === "global";
  const estado = new Map<string, RoadmapOverride>();
  const planes = new Map<string, PlanStored>();
  const realizadas = new Set<string>();
  for (const r of datos.roadmapEstado) {
    if (r.feuille !== feuille) continue;
    estado.set(r.tareaKey, {
      oculta: r.oculta,
      creada: r.creada,
      componente: (r.componente as ComponenteCode | null) ?? null,
      fila: r.fila,
      orden: r.orden,
      banda: r.banda,
      nombre: r.nombre,
    });
    planes.set(r.tareaKey, {
      durValor: r.durValor,
      durUnidad: r.durUnidad,
      fechaInicio: r.fechaInicio,
      fechaFin: r.fechaFin,
    });
    // Tâche déjà cochée : la feuille sert à préparer ce qui vient, pas à
    // rappeler ce qui est fait.
    if (r.realizada) realizadas.add(r.tareaKey);
  }

  const tipologia = esGlobal
    ? ""
    : datos.subproyectos.find((s) => s.uid === feuille)?.tipologia ?? "";
  const columnas = construirCartasPorFila(
    esGlobal
      ? { esGlobal: true, semestres: SEMESTRES_CODES, estado }
      : { esGlobal: false, tipologia, uid: feuille, estado },
  );

  const tasks: {
    key: string;
    fase: string;
    durValor: number | null;
    durUnidad: Unidad | null;
    fechaInicio: string | null;
    fechaFin: string | null;
  }[] = [];
  const meta = new Map<string, { nombre: string; comp: ComponenteCode }>();

  for (const [colKey, cards] of columnas) {
    const fila = colKey.split("|")[0];
    for (const c of cards) {
      if (c.nota) continue;
      // Feuille globale : le plan par défaut dépend du semestre (planGlobalEfectivo).
      const p = esGlobal
        ? planGlobalEfectivo(fila, c.key, planes.get(c.key))
        : planes.get(c.key) ?? null;
      tasks.push({
        key: c.key,
        fase: fila,
        durValor: p?.durValor ?? null,
        durUnidad: asUnidad(p?.durUnidad),
        fechaInicio: p?.fechaInicio ?? null,
        fechaFin: p?.fechaFin ?? null,
      });
      meta.set(c.key, { nombre: c.nombre, comp: c.componente });
    }
  }

  // Repères et jalons (modèle enveloppe, migration 036) : ce sont des tâches de
  // plein droit — « Inicio de la obra » ou une « No objeción AFD » sont des
  // échéances à afficher dans « Próximas tareas » comme les autres.
  const envolvente = !esGlobal && esModeloEnvolvente(feuille);
  if (envolvente) {
    for (const h of lineasHito(estado)) {
      const p = planes.get(h.key) ?? null;
      tasks.push({
        key: h.key,
        fase: h.rol === "cno" ? "" : h.fase,
        durValor: p?.durValor ?? null,
        durUnidad: asUnidad(p?.durUnidad),
        fechaInicio: p?.fechaInicio ?? null,
        fechaFin: p?.fechaFin ?? null,
      });
      meta.set(h.key, { nombre: h.nombre, comp: "GP" });
    }
  }

  // Ancres de phase : nœuds `__fase__*`, qui servent aussi de tâches à part
  // entière (le démarrage d'une phase est un jalon en soi). En mode enveloppe
  // ils n'ont plus de dates propres : elles découlent des lignes de la phase.
  const faseInicio: Record<string, string | null> = {};
  const fasesFeuille = esGlobal ? [] : datos.fases.filter((f) => f.subproyecto_uid === feuille);
  for (const f of fasesFeuille) {
    faseInicio[f.fase] = f.fecha_inicio;
    tasks.push({
      key: faseNodeKey(f.fase),
      fase: "",
      durValor: envolvente ? null : f.dur_valor,
      durUnidad: envolvente ? null : asUnidad(f.dur_unidad),
      fechaInicio: envolvente ? null : f.fecha_inicio,
      fechaFin: envolvente ? null : f.fecha_fin,
    });
  }

  const links = datos.roadmapEnlace
    .filter((e) => e.feuille === feuille)
    .map((e) => ({
      desde: e.desde,
      hacia: e.hacia,
      punto: e.punto,
      desfaseValor: e.desfaseValor,
      desfaseUnidad: e.desfaseUnidad,
      extremo: e.extremo,
    }));

  const sched = computeSchedule({
    tasks,
    links,
    faseInicio,
    projectStart: PROJECT_START,
    fasesEnvolventes: envolvente,
  });

  const out: Omit<TareaAgenda, "subproyecto" | "sigla" | "tipologia">[] = [];
  for (const [key, r] of sched) {
    // `end` (et non `solidEnd`) : une tâche court jusqu'au bord de sa barre,
    // hachures comprises.
    const inicioMs = isoMs(r.start);
    const finMs = isoMs(r.end);
    if (inicioMs == null || finMs == null) continue;
    const esFase = key.startsWith("__fase__");
    if (esFase) {
      const code = key.replace("__fase__", "");
      // La ligne « general » n'est pas une étape du déroulé : rien à annoncer.
      if (code === "general") continue;
      out.push({
        id: `${feuille}|${key}`,
        nombre: NOMBRE_FASE.get(code) ?? code,
        componente: null,
        esFase: true,
        feuille,
        inicioMs,
        finMs,
      });
      continue;
    }
    if (realizadas.has(key)) continue;
    const m = meta.get(key);
    if (!m) continue;
    out.push({
      id: `${feuille}|${key}`,
      nombre: m.nombre,
      componente: m.comp,
      esFase: false,
      feuille,
      inicioMs,
      finMs,
    });
  }
  return out;
}

// Même origine de projet que le Cronograma et les Hojas de ruta.
const PROJECT_START = "2026-01-01";

/**
 * Forme courte d'un sous-projet, pour tenir en tête de ligne.
 * Les écoles sont désignées par leur NUMÉRO d'établissement — seul repère court
 * qui les distingue ; leur uid (SUB-ESC-007) ne dirait rien. Les autres sont
 * dérivés de l'uid : sigle tel quel s'il fait 3 lettres (AIR, ASV), sinon
 * capitalisé (CENTENARIO -> Centenario).
 */
export function siglaSubproyecto(uid: string, nombre: string): string {
  if (uid === "global") return "Global";
  const num = /N[°º]\s*(\d+)/.exec(nombre);
  if (num) return `N°${num[1]}`;
  const base = uid.replace(/^SUB-/, "");
  return base.length <= 3 ? base : base.charAt(0) + base.slice(1).toLowerCase();
}

/** Ajoute `n` mois à un instant, en restant sur le même quantième si possible. */
function masMeses(ms: number, n: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth() + n, d.getDate()).getTime();
}

/**
 * Fenêtre d'une tâche par rapport à « hoy » — SOURCE UNIQUE du découpage,
 * partagée par « Próximas tareas » (feuille globale) et par la feuille PAG :
 * les deux vues doivent classer avec les mêmes bornes, sinon le lecteur ne sait
 * plus ce que « próximo mes » veut dire selon l'écran où il se trouve.
 * Les fenêtres sont EXCLUSIVES : l'ordre des tests est l'ordre de priorité.
 * `null` = hors des deux prochains mois (ou déjà terminée).
 */
export function ventanaDe(hoyMs: number, inicioMs: number, finMs: number): Ventana | null {
  const lim15 = hoyMs + 15 * 86_400_000;
  const lim1m = masMeses(hoyMs, 1);
  const lim2m = masMeses(hoyMs, 2);
  if (inicioMs <= hoyMs && finMs > hoyMs) return "en_curso";
  if (inicioMs > hoyMs && inicioMs <= lim15) return "d15";
  if (inicioMs > lim15 && inicioMs <= lim1m) return "m1";
  if (inicioMs > lim1m && inicioMs <= lim2m) return "m2";
  return null;
}

/**
 * Construit l'agenda à partir de TOUTES les feuilles (globale + sous-projets).
 * `hoyMs` est injecté (jamais `Date.now()` ici) pour rester testable.
 */
export function construirAgenda(datos: Datos, hoyMs: number): Agenda {
  const nombreDe = new Map(datos.subproyectos.map((s) => [s.uid, s.nombre]));
  const tipoDe = new Map(datos.subproyectos.map((s) => [s.uid, s.tipologia]));

  const feuilles = ["global", ...datos.subproyectos.map((s) => s.uid)];
  const cubos: Record<Ventana, TareaAgenda[]> = { en_curso: [], d15: [], m1: [], m2: [] };

  for (const f of feuilles) {
    for (const t of tareasDeFeuille(datos, f)) {
      const nombreSub = f === "global" ? "Proyecto global" : nombreDe.get(f) ?? f;
      const tarea: TareaAgenda = {
        ...t,
        subproyecto: nombreSub,
        sigla: siglaSubproyecto(f, nombreSub),
        tipologia: f === "global" ? null : tipoDe.get(f) ?? null,
      };
      const v = ventanaDe(hoyMs, tarea.inicioMs, tarea.finMs);
      if (v) cubos[v].push(tarea);
    }
  }

  // « En curso » se trie par FIN la plus proche (ce qui se termine bientôt
  // d'abord) ; les fenêtres à venir par date de démarrage.
  cubos.en_curso.sort((a, b) => a.finMs - b.finMs || a.subproyecto.localeCompare(b.subproyecto));
  for (const k of ["d15", "m1", "m2"] as const)
    cubos[k].sort((a, b) => a.inicioMs - b.inicioMs || a.subproyecto.localeCompare(b.subproyecto));

  return VENTANAS.map((v) => ({ ...v, tareas: cubos[v.key] }));
}
