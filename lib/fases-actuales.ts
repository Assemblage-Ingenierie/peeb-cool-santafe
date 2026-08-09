// ============================================================
// lib/fases-actuales.ts — « Fases en curso » de l'Inicio.
//
// Pour chaque sous-projet : quelle FASE la barre rouge « hoy » du cronograma
// traverse aujourd'hui, et l'avancement dans cette fase. Pour le PAG : quels
// ejes ont une acción en cours aujourd'hui.
//
// Ne stocke RIEN : tout est recalculé avec le MÊME moteur (`computeSchedule`) et
// les mêmes entrées que le Cronograma et les Hojas de ruta → les vues ne peuvent
// pas diverger. Pur (aucune dépendance DB/React) → testable et réutilisable côté
// client.
// ============================================================

import { GESTION_FASES, esModeloEnvolvente, type ComponenteCode } from "@/lib/constants";
import { construirCartasPorFila, lineasHito, type RoadmapOverride } from "@/lib/roadmap";
import { computeSchedule, faseNodeKey, type Unidad } from "@/lib/schedule";
import { FASES_ORD } from "@/lib/fases-cronograma";
import { FEUILLE_PAG, PAG_ACCIONES, PAG_EJES, pagTareaKey, type PagEje } from "@/lib/pag";
import type { Roadmap, Snapshot } from "@/lib/snapshot";

type Datos = Snapshot & Roadmap;

const PROJECT_START = "2026-01-01";

const asUnidad = (u: string | null | undefined): Unidad | null =>
  u === "dia" || u === "semana" || u === "mes" ? u : null;

// Date ISO (YYYY-MM-DD) → ms LOCAUX (même conversion que la barre « hoy » du Cronograma).
function isoMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime() : null;
}

const NOMBRE_FASE = new Map(GESTION_FASES.map((f) => [f.code, f.nombre] as [string, string]));

export interface FaseActualSub {
  uid: string;
  nombre: string;
  tipologia: string; // A | H | E
  faseCode: string;
  faseNombre: string;
  progreso: number; // 0..1 dans la fase courante
}

/**
 * Fase que la barra « hoy » atraviesa para un sub-proyecto (o null si aún no
 * empezó / ya terminó / no está programado). Reproduce el `armar` del cronograma.
 */
function faseEnCursoDe(datos: Datos, uid: string, tipologia: string, hoyMs: number): FaseActualSub | null {
  const envolvente = esModeloEnvolvente(uid);
  const estado = new Map<string, RoadmapOverride>();
  const planes = new Map<
    string,
    { durValor: number | null; durUnidad: string | null; fechaInicio: string | null; fechaFin: string | null }
  >();
  for (const r of datos.roadmapEstado) {
    if (r.feuille !== uid) continue;
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
  }

  const columnas = construirCartasPorFila({ esGlobal: false, tipologia, uid, estado });
  const tasks: {
    key: string;
    fase: string;
    durValor: number | null;
    durUnidad: Unidad | null;
    fechaInicio: string | null;
    fechaFin: string | null;
  }[] = [];
  for (const [colKey, cards] of columnas) {
    const fila = colKey.split("|")[0];
    for (const c of cards) {
      if (c.nota) continue;
      const p = planes.get(c.key);
      tasks.push({
        key: c.key,
        fase: fila,
        durValor: p?.durValor ?? null,
        durUnidad: asUnidad(p?.durUnidad),
        fechaInicio: p?.fechaInicio ?? null,
        fechaFin: p?.fechaFin ?? null,
      });
    }
  }
  // Repères / jalons (modèle enveloppe) : lignes de planning, pas des cartes.
  if (envolvente) {
    for (const h of lineasHito(estado)) {
      const p = planes.get(h.key);
      tasks.push({
        key: h.key,
        fase: h.rol === "cno" ? "" : h.fase,
        durValor: p?.durValor ?? null,
        durUnidad: asUnidad(p?.durUnidad),
        fechaInicio: p?.fechaInicio ?? null,
        fechaFin: p?.fechaFin ?? null,
      });
    }
  }
  // Nœuds de phase : la LISTE vient du référentiel, plus de `gestion_lineas`.
  // En modèle enveloppe la phase découle de ses lignes, et une phase sans ligne
  // datée se signale par `sinAncla` — plus besoin de savoir laquelle portait
  // une date en base.
  const faseInicio: Record<string, string | null> = {};
  for (const f of GESTION_FASES) {
    tasks.push({
      key: faseNodeKey(f.code),
      fase: "",
      durValor: null,
      durUnidad: null,
      fechaInicio: null,
      fechaFin: null,
    });
  }

  const links = datos.roadmapEnlace
    .filter((e) => e.feuille === uid)
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

  // Enveloppes de phase, dans l'ordre chronologique canonique.
  const enveloppes: { code: string; startMs: number; endMs: number }[] = [];
  for (const f of FASES_ORD) {
    const sr = sched.get(faseNodeKey(f.code));
    // `sinAncla` suffit désormais : une phase sans ligne datée n'a pas
    // d'enveloppe, et le moteur le dit au lieu de la poser au début du projet.
    if (!sr || sr.sinAncla) continue;
    const s = isoMs(sr.start);
    const e = isoMs(sr.end);
    if (s == null || e == null) continue;
    enveloppes.push({ code: f.code, startMs: s, endMs: e });
  }
  enveloppes.sort((a, b) => a.startMs - b.startMs);

  const actual = enveloppes.find((e) => e.startMs <= hoyMs && e.endMs > hoyMs);
  if (!actual) return null; // aún no empezó / ya terminó / no programado

  const span = actual.endMs - actual.startMs;
  const progreso = span > 0 ? Math.min(1, Math.max(0, (hoyMs - actual.startMs) / span)) : 0;
  return {
    uid,
    nombre: datos.subproyectos.find((s) => s.uid === uid)?.nombre ?? uid,
    tipologia,
    faseCode: actual.code,
    faseNombre: NOMBRE_FASE.get(actual.code) ?? actual.code,
    progreso,
  };
}

/** Sous-projets dont une fase est EN COURS aujourd'hui (barre « hoy » la traverse). */
export function fasesEnCurso(datos: Datos, hoyMs: number): FaseActualSub[] {
  const out: FaseActualSub[] = [];
  for (const s of datos.subproyectos) {
    const r = faseEnCursoDe(datos, s.uid, s.tipologia, hoyMs);
    if (r) out.push(r);
  }
  // Ordre = `orden` des sous-projets (déjà trié dans le snapshot) → groupé par typologie.
  return out;
}

// ------------------------------------------------------------
// PAG — ejes con una acción EN CURSO hoy.
// ------------------------------------------------------------
export interface PagEjeActual {
  code: PagEje;
  nombre: string;
  impactos: string;
  accion: { code: string; titulo: string; responsable: string };
  progreso: number; // 0..1 dans l'acción en cours (la plus avancée de l'eje)
}

export interface PagEjeProximo {
  code: PagEje;
  nombre: string;
  inicioMs: number; // début de sa 1re acción à venir
}

export interface PagEstado {
  enCurso: PagEjeActual[];
  proximos: PagEjeProximo[]; // ejes pas encore démarrés (aucune acción en cours), triés par date
}

/** État du PAG par eje : ce qui court aujourd'hui, et ce qui reste à démarrer. */
export function pagEstado(datos: Datos, hoyMs: number): PagEstado {
  const stored = new Map<string, { durValor: number | null; durUnidad: string | null; fechaInicio: string | null; fechaFin: string | null }>();
  for (const r of datos.roadmapEstado) {
    if (r.feuille === FEUILLE_PAG)
      stored.set(r.tareaKey, {
        durValor: r.durValor,
        durUnidad: r.durUnidad,
        fechaInicio: r.fechaInicio,
        fechaFin: r.fechaFin,
      });
  }
  const tasks = PAG_ACCIONES.map((a) => {
    const st = stored.get(pagTareaKey(a.code));
    const u = asUnidad(st?.durUnidad);
    const dur = st?.durValor != null && u != null ? { v: st.durValor, u } : { v: a.durValor, u: a.durUnidad };
    return {
      key: a.code,
      fase: "",
      durValor: dur.v,
      durUnidad: dur.u,
      fechaInicio: st?.fechaInicio ?? a.inicio,
      fechaFin: st?.fechaFin ?? a.fin ?? null,
    };
  });
  const sched = computeSchedule({ tasks, links: [], faseInicio: {}, projectStart: PROJECT_START });

  const enCurso: PagEjeActual[] = [];
  const proximos: PagEjeProximo[] = [];
  for (const eje of PAG_EJES) {
    let mejor: PagEjeActual["accion"] | null = null;
    let mejorProg = -1;
    let inicioFuturo: number | null = null; // début de la 1re acción à venir
    for (const a of PAG_ACCIONES) {
      if (a.eje !== eje.code) continue;
      const sr = sched.get(a.code);
      if (!sr) continue;
      const s = isoMs(sr.start);
      const e = isoMs(sr.end);
      if (s == null || e == null) continue;
      if (s <= hoyMs && e > hoyMs) {
        const span = e - s;
        const prog = span > 0 ? Math.min(1, Math.max(0, (hoyMs - s) / span)) : 0;
        // On garde l'acción la plus avancée de l'eje comme représentante.
        if (prog > mejorProg) {
          mejorProg = prog;
          mejor = { code: a.code, titulo: a.titulo, responsable: a.responsable };
        }
      } else if (s > hoyMs && (inicioFuturo == null || s < inicioFuturo)) {
        inicioFuturo = s;
      }
    }
    if (mejor) {
      enCurso.push({ code: eje.code, nombre: eje.nombre, impactos: eje.impactos, accion: mejor, progreso: mejorProg });
    } else if (inicioFuturo != null) {
      proximos.push({ code: eje.code, nombre: eje.nombre, inicioMs: inicioFuturo });
    }
  }
  proximos.sort((a, b) => a.inicioMs - b.inicioMs);
  return { enCurso, proximos };
}
