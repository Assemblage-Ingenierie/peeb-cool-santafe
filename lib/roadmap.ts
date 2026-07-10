// ============================================================
// lib/roadmap.ts — Modèle partagé des cartes de la feuille de route.
// Source unique de la logique « cartes d'une feuille, par colonne (fila ×
// composante) » : cartes par défaut (constantes + tâches dynamiques AyS selon
// les requisitos cochés) + cartes créées, moins les masquées, avec overrides
// de position (fila/orden). Utilisé par la page Hojas de ruta ET par l'Admin
// (section Fases) → les tâches restent synchronisées (même DB, même logique).
// ============================================================

import { ROADMAP_TAREAS, type ComponenteCode } from "./constants";

export interface RoadmapCard {
  key: string;
  componente: ComponenteCode;
  nombre: string;
  descripcion?: string;
  responsable?: string;
  comentario?: string;
  nota?: boolean; // carte informative (placeholder dynamique) — non planifiable
  orden?: number; // clé de tri effective dans la colonne
}

// Overrides persistés d'une tâche (peebcoolsf_roadmap_estado), par tarea_key.
export interface RoadmapOverride {
  oculta?: boolean;
  creada?: boolean;
  componente?: ComponenteCode | null;
  fila?: string | null;
  orden?: number | null;
  nombre?: string | null; // titre d'une carte créée
}

/**
 * Cartes par défaut d'une feuille de sous-projet (jamais pour « Proyecto global »).
 * Filtre la visibilité par sous-projet : `soloTipologias` (A/H/E) et
 * `soloSubproyectos` (uids) — cf. cellules noires de l'Excel.
 */
export function cartasBaseSubproyecto(ctx: {
  tipologia: string;
  uid: string;
}): (RoadmapCard & { fila: string })[] {
  return ROADMAP_TAREAS.filter(
    (t) =>
      (!t.soloTipologias || t.soloTipologias.includes(ctx.tipologia)) &&
      (!t.soloSubproyectos || t.soloSubproyectos.includes(ctx.uid)),
  ).map((t) => ({
    key: t.id ?? t.nombre,
    componente: t.componente,
    nombre: t.nombre,
    responsable: t.responsable,
    comentario: t.comentario,
    fila: t.fase,
  }));
}

/**
 * Cartes par défaut de la feuille « Proyecto global » (une entrée par semestre).
 * GP : « Informe semestral » (semestres S1) / « Informe anual » (semestres S2).
 * AyS : « Informe Semestral AyS » (tous les semestres). `semestres` = codes de
 * semestre (`s1-2027`, `s2-2026`…) — la source unique reste la liste SEMESTRES
 * de la page Hojas de ruta, passée en argument.
 */
// Commentaire par défaut des cartes « Informe Semestral AyS » (MGAS §9.1.5 —
// contenido mínimo del informe semestral). Les sauts de ligne sont préservés à
// l'affichage (ComentariosPanel : whitespace-pre-line).
const COMENTARIO_INFORME_AYS = `Informes elaborados por la UG/ACEFE (MGAS 9.1.5)

* El estado de la elaboración y ejecución de los documentos ambientales y sociales requeridos por el Proyecto.
* El estado de la implementación de las medidas ambientales, sociales y de salud y seguridad requeridas en los instrumentos de gestión, para los diferentes municipios.
* El estado de implementación del plan de capacitaciones.
* Reporte de accidentes/incidentes.
* Las actividades del Plan de Participación de Partes Interesadas (PPPI), con énfasis especial en lo relacionado con el Mecanismo de Atención de Reclamos y Resolución de Conflictos, incluyendo las quejas y los reclamos recibidos y el estado de su resolución.
Anexo 1 (Contenido mínimo del informe semestral)`;

export function cartasBaseGlobal(semestres: string[]): (RoadmapCard & { fila: string })[] {
  const cards: (RoadmapCard & { fila: string })[] = [];
  for (const code of semestres) {
    const esS1 = code.startsWith("s1-");
    cards.push({
      key: `informe-gp-${code}`,
      componente: "GP",
      nombre: esS1 ? "Informe semestral" : "Informe anual",
      fila: code,
    });
    cards.push({
      key: `informe-ays-${code}`,
      componente: "AyS",
      nombre: "Informe Semestral AyS",
      comentario: COMENTARIO_INFORME_AYS,
      fila: code,
    });
  }
  return cards;
}

/**
 * Cartes d'une feuille groupées par colonne `${fila}|${componente}`, triées par
 * orden. `estado` = overrides par tarea_key (pour CETTE feuille uniquement).
 */
export function construirCartasPorFila(opts: {
  esGlobal: boolean;
  tipologia?: string; // typologie du sous-projet (A/H/E) — visibilité des cartes
  uid?: string; // uid du sous-projet — visibilité des cartes par sous-projet
  semestres?: string[]; // codes de semestre (feuille globale uniquement)
  estado: Map<string, RoadmapOverride>;
}): Map<string, RoadmapCard[]> {
  const { esGlobal, tipologia, uid, semestres, estado } = opts;
  const acc = new Map<string, RoadmapCard[]>();
  const add = (fila: string, comp: ComponenteCode, card: RoadmapCard, orden: number) => {
    const key = `${fila}|${comp}`;
    const c = { ...card, orden };
    const arr = acc.get(key);
    if (arr) arr.push(c);
    else acc.set(key, [c]);
  };
  // Cartes par défaut : informes por semestre (global) ou tâches par fase (sous-projet).
  {
    const base = esGlobal
      ? cartasBaseGlobal(semestres ?? [])
      : cartasBaseSubproyecto({ tipologia: tipologia ?? "", uid: uid ?? "" });
    let idx = 0;
    for (const card of base) {
      idx += 1;
      const ov = estado.get(card.key);
      if (ov?.oculta) continue;
      add(ov?.fila ?? card.fila, card.componente, card, ov?.orden ?? idx);
    }
  }
  // Cartes créées.
  for (const [tareaKey, ov] of estado) {
    if (!ov.creada || !ov.componente || !ov.fila) continue;
    add(ov.fila, ov.componente, { key: tareaKey, componente: ov.componente, nombre: ov.nombre ?? "" }, ov.orden ?? 0);
  }
  for (const arr of acc.values()) {
    arr.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || (a.key < b.key ? -1 : 1));
  }
  return acc;
}
