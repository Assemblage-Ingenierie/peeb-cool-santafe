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
 * Cartes STATIQUES issues de ROADMAP_TAREAS. La visibilité par sous-projet
 * (cartes par typologie / cellules noires de l'Excel) sera gérée dans un lot
 * ultérieur.
 */
export function cartasBaseSubproyecto(): (RoadmapCard & { fila: string })[] {
  return ROADMAP_TAREAS.map((t) => ({
    key: t.id ?? t.nombre,
    componente: t.componente,
    nombre: t.nombre,
    responsable: t.responsable,
    comentario: t.comentario,
    fila: t.fase,
  }));
}

/**
 * Cartes d'une feuille groupées par colonne `${fila}|${componente}`, triées par
 * orden. `estado` = overrides par tarea_key (pour CETTE feuille uniquement).
 */
export function construirCartasPorFila(opts: {
  esGlobal: boolean;
  requisitosCodes?: string[]; // conservé pour compat (visibilité par sous-projet à venir)
  estado: Map<string, RoadmapOverride>;
}): Map<string, RoadmapCard[]> {
  const { esGlobal, estado } = opts;
  const acc = new Map<string, RoadmapCard[]>();
  const add = (fila: string, comp: ComponenteCode, card: RoadmapCard, orden: number) => {
    const key = `${fila}|${comp}`;
    const c = { ...card, orden };
    const arr = acc.get(key);
    if (arr) arr.push(c);
    else acc.set(key, [c]);
  };
  // Cartes par défaut (jamais pour le global).
  if (!esGlobal) {
    let idx = 0;
    for (const card of cartasBaseSubproyecto()) {
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
