import { FASES, HITOS_FASE, type ComponenteCode } from "@/lib/constants";
import { construirCartasPorFila, type RoadmapOverride } from "@/lib/roadmap";
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
  subproyecto: string; // libellé affiché
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
function tareasDeFeuille(datos: Datos, feuille: string): Omit<TareaAgenda, "subproyecto" | "tipologia">[] {
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

  // Ancres de phase : nœuds `__fase__*`, qui servent aussi de tâches à part
  // entière (le démarrage d'une phase est un jalon en soi).
  const faseInicio: Record<string, string | null> = {};
  const fasesFeuille = esGlobal ? [] : datos.fases.filter((f) => f.subproyecto_uid === feuille);
  for (const f of fasesFeuille) {
    faseInicio[f.fase] = f.fecha_inicio;
    tasks.push({
      key: faseNodeKey(f.fase),
      fase: "",
      durValor: f.dur_valor,
      durUnidad: asUnidad(f.dur_unidad),
      fechaInicio: f.fecha_inicio,
      fechaFin: f.fecha_fin,
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
    }));

  const sched = computeSchedule({ tasks, links, faseInicio, projectStart: PROJECT_START });

  const out: Omit<TareaAgenda, "subproyecto" | "tipologia">[] = [];
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

/** Ajoute `n` mois à un instant, en restant sur le même quantième si possible. */
function masMeses(ms: number, n: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth() + n, d.getDate()).getTime();
}

/**
 * Construit l'agenda à partir de TOUTES les feuilles (globale + sous-projets).
 * `hoyMs` est injecté (jamais `Date.now()` ici) pour rester testable.
 */
export function construirAgenda(datos: Datos, hoyMs: number): Agenda {
  const lim15 = hoyMs + 15 * 86_400_000;
  const lim1m = masMeses(hoyMs, 1);
  const lim2m = masMeses(hoyMs, 2);

  const nombreDe = new Map(datos.subproyectos.map((s) => [s.uid, s.nombre]));
  const tipoDe = new Map(datos.subproyectos.map((s) => [s.uid, s.tipologia]));

  const feuilles = ["global", ...datos.subproyectos.map((s) => s.uid)];
  const cubos: Record<Ventana, TareaAgenda[]> = { en_curso: [], d15: [], m1: [], m2: [] };

  for (const f of feuilles) {
    for (const t of tareasDeFeuille(datos, f)) {
      const tarea: TareaAgenda = {
        ...t,
        subproyecto: f === "global" ? "Proyecto global" : nombreDe.get(f) ?? f,
        tipologia: f === "global" ? null : tipoDe.get(f) ?? null,
      };
      // Ordre des tests = ordre de priorité : une tâche en cours n'est jamais
      // recomptée dans une fenêtre à venir.
      if (tarea.inicioMs <= hoyMs && tarea.finMs > hoyMs) cubos.en_curso.push(tarea);
      else if (tarea.inicioMs > hoyMs && tarea.inicioMs <= lim15) cubos.d15.push(tarea);
      else if (tarea.inicioMs > lim15 && tarea.inicioMs <= lim1m) cubos.m1.push(tarea);
      else if (tarea.inicioMs > lim1m && tarea.inicioMs <= lim2m) cubos.m2.push(tarea);
    }
  }

  // « En curso » se trie par FIN la plus proche (ce qui se termine bientôt
  // d'abord) ; les fenêtres à venir par date de démarrage.
  cubos.en_curso.sort((a, b) => a.finMs - b.finMs || a.subproyecto.localeCompare(b.subproyecto));
  for (const k of ["d15", "m1", "m2"] as const)
    cubos[k].sort((a, b) => a.inicioMs - b.inicioMs || a.subproyecto.localeCompare(b.subproyecto));

  return VENTANAS.map((v) => ({ ...v, tareas: cubos[v.key] }));
}
