// ============================================================
// lib/roadmap.ts — Modèle partagé des cartes de la feuille de route.
// Source unique de la logique « cartes d'une feuille, par colonne (fila ×
// composante) » : cartes par défaut (constantes + tâches dynamiques AyS selon
// les requisitos cochés) + cartes créées, moins les masquées, avec overrides
// de position (fila/orden). Utilisé par la page Hojas de ruta ET par l'Admin
// (section Fases) → les tâches restent synchronisées (même DB, même logique).
// ============================================================

import {
  ROADMAP_TAREAS,
  REQUISITOS_AYS,
  REQUISITOS_AYS_CODES,
  refMgas,
  type ComponenteCode,
} from "./constants";

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

const REQ_LABEL = new Map<string, string>(
  REQUISITOS_AYS.flatMap((g) => g.requisitos.map((r) => [r.code, r.label] as const)),
);

/**
 * Cartes par défaut d'une feuille de sous-projet (jamais pour « Proyecto global »).
 * `requisitosCodes` = codes des requisitos AyS cochés (tâches `dinamica`).
 */
export function cartasBaseSubproyecto(
  requisitosCodes: string[],
): (RoadmapCard & { fila: string })[] {
  const checked = new Set(requisitosCodes);
  const out: (RoadmapCard & { fila: string })[] = [];
  for (const t of ROADMAP_TAREAS) {
    if (!t.dinamica) {
      out.push({
        key: t.id ?? t.nombre,
        componente: t.componente,
        nombre: t.nombre,
        responsable: t.responsable,
        comentario: t.comentario,
        fila: t.fase,
      });
      continue;
    }
    const planes = REQUISITOS_AYS_CODES.filter((c) => checked.has(c));
    if (planes.length === 0) {
      out.push({
        key: `${t.fase}-vacio`,
        componente: t.componente,
        nombre: t.nombre,
        descripcion: "Sin requisitos AyS marcados",
        nota: true,
        fila: t.fase,
      });
      continue;
    }
    for (const c of planes) {
      out.push({
        key: `${t.fase}-${c}`,
        componente: t.componente,
        nombre: REQ_LABEL.get(c) ?? c,
        descripcion: refMgas(c),
        fila: t.fase,
      });
    }
  }
  return out;
}

/**
 * Cartes d'une feuille groupées par colonne `${fila}|${componente}`, triées par
 * orden. `estado` = overrides par tarea_key (pour CETTE feuille uniquement).
 */
export function construirCartasPorFila(opts: {
  esGlobal: boolean;
  requisitosCodes: string[];
  estado: Map<string, RoadmapOverride>;
}): Map<string, RoadmapCard[]> {
  const { esGlobal, requisitosCodes, estado } = opts;
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
    for (const card of cartasBaseSubproyecto(requisitosCodes)) {
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
