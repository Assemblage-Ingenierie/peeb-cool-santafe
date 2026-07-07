// ============================================================
// lib/roadmap.ts — Modèle partagé des cartes de la feuille de route.
// Source unique de la logique « cartes d'une feuille, par colonne (fila ×
// composante) » : cartes par défaut (constantes + tâches dynamiques AyS selon
// les requisitos cochés) + cartes créées, moins les masquées, avec overrides
// de position (fila/orden). Utilisé par la page Hojas de ruta ET par l'Admin
// (section Fases) → les tâches restent synchronisées (même DB, même logique).
// ============================================================

import { ROADMAP_TAREAS, REQUISITOS_AYS, refMgas, type ComponenteCode } from "./constants";

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

// Génération des cartes dynamiques de la phase « Proyecto ejecutivo » selon les
// requisitos AyS cochés du sous-projet :
//  • groupes 10.5 / 10.6 : UNE carte par groupe (« Lineamientos para … », d'après
//    le nom du groupe) dès qu'au moins une de ses lignes est cochée ;
//  • groupe 10.7 (gestión social) : UNE carte par ligne cochée (nom exact).
// N'affecte que la feuille de route ; REQUISITOS_AYS (checklist / dashboard) reste
// inchangé.
const GRUPO_POR_LINEA = "10.7";

// « Planes para … » / « Programas/planes para … » → « Lineamientos para … ».
function lineamientosGrupo(titulo: string): string {
  return `Lineamientos para ${titulo.replace(/^(?:Programas\/planes|Planes|Programas)\s+para\s+/i, "")}`;
}

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
    const algunoMarcado = REQUISITOS_AYS.some((g) => g.requisitos.some((r) => checked.has(r.code)));
    if (!algunoMarcado) {
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
    for (const g of REQUISITOS_AYS) {
      const marcados = g.requisitos.filter((r) => checked.has(r.code));
      if (marcados.length === 0) continue;
      if (g.code === GRUPO_POR_LINEA) {
        // Gestión social : une carte par ligne cochée (nom exact de la ligne).
        for (const r of marcados) {
          out.push({
            key: `${t.fase}-${r.code}`,
            componente: t.componente,
            nombre: r.label,
            descripcion: refMgas(r.code),
            fila: t.fase,
          });
        }
      } else {
        // Une seule carte « Lineamientos para … » pour tout le groupe.
        out.push({
          key: `${t.fase}-grupo-${g.code}`,
          componente: t.componente,
          nombre: lineamientosGrupo(g.titulo),
          descripcion: refMgas(g.code),
          fila: t.fase,
        });
      }
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
