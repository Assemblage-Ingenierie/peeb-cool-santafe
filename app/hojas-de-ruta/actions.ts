"use server";

import { randomUUID } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentUser, isAdmin } from "@/lib/auth";

// ============================================================
// Server Actions — Hojas de ruta (état d'édition admin, écriture).
// Persistance : peebcoolsf_roadmap_estado / _enlace. Autorisation admin.
// feuille = 'global' | uid de sous-projet ; tarea_key = clé de carte.
// Lecture publique = via /api/snapshot (service_role).
// ============================================================

const ESTADO = "peebcoolsf_roadmap_estado";
const ENLACE = "peebcoolsf_roadmap_enlace";
const ANO_KEY = "__ano_afd__";

function assertAdmin() {
  if (!isAdmin(getCurrentUser())) throw new Error("No autorizado");
}

function assertFeuille(feuille: string) {
  if (feuille !== "global" && !/^SUB-[A-Z0-9-]+$/.test(feuille)) {
    throw new Error(`Feuille inválida: ${feuille}`);
  }
}

function assertKey(key: string) {
  if (!key || key.length > 300) throw new Error("Clave de tarea inválida");
}

const COMPONENTES_VALIDAS = new Set(["GP", "EE", "AyS", "G"]);
function assertComponente(componente: string) {
  if (!COMPONENTES_VALIDAS.has(componente)) {
    throw new Error(`Componente inválida: ${componente}`);
  }
}

function assertFila(fila: string) {
  if (!fila || fila.length > 100) throw new Error("Fila inválida");
}

/** Texte vide → NULL (convention projet). */
function nullable(v: string | null | undefined): string | null {
  const t = (v ?? "").trim();
  return t === "" ? null : t;
}

/** Case « réalisée » d'une tâche. */
export async function roadmapSetRealizada(
  feuille: string,
  tareaKey: string,
  realizada: boolean,
): Promise<void> {
  assertAdmin();
  assertFeuille(feuille);
  assertKey(tareaKey);
  const sb = createServiceClient();
  const { error } = await sb
    .from(ESTADO)
    .upsert({ feuille, tarea_key: tareaKey, realizada }, { onConflict: "feuille,tarea_key" });
  if (error) throw new Error(error.message);
}

/** Commentaire libre (admin) d'une tâche. */
export async function roadmapSetComentario(
  feuille: string,
  tareaKey: string,
  comentario: string,
): Promise<void> {
  assertAdmin();
  assertFeuille(feuille);
  assertKey(tareaKey);
  const sb = createServiceClient();
  const { error } = await sb
    .from(ESTADO)
    .upsert(
      { feuille, tarea_key: tareaKey, comentario: nullable(comentario) },
      { onConflict: "feuille,tarea_key" },
    );
  if (error) throw new Error(error.message);
}

/** Surcharges d'édition (nom / description / responsable ; vide → défaut). */
export async function roadmapSetEdicion(
  feuille: string,
  tareaKey: string,
  nombre: string,
  descripcion: string,
  responsable: string,
): Promise<void> {
  assertAdmin();
  assertFeuille(feuille);
  assertKey(tareaKey);
  const sb = createServiceClient();
  const { error } = await sb.from(ESTADO).upsert(
    {
      feuille,
      tarea_key: tareaKey,
      nombre: nullable(nombre),
      descripcion: nullable(descripcion),
      responsable: nullable(responsable),
    },
    { onConflict: "feuille,tarea_key" },
  );
  if (error) throw new Error(error.message);
}

/** Case « No objeción AFD recibida » (par feuille). */
export async function roadmapSetAnoAfd(feuille: string, recibida: boolean): Promise<void> {
  assertAdmin();
  assertFeuille(feuille);
  const sb = createServiceClient();
  const { error } = await sb
    .from(ESTADO)
    .upsert(
      { feuille, tarea_key: ANO_KEY, realizada: recibida },
      { onConflict: "feuille,tarea_key" },
    );
  if (error) throw new Error(error.message);
}

/** Crée une carte (composante fixe) sur une feuille/fila. Retourne sa clé. */
export async function roadmapCrearCarta(
  feuille: string,
  componente: string,
  fila: string,
  nombre: string,
  orden: number,
): Promise<string> {
  assertAdmin();
  assertFeuille(feuille);
  assertComponente(componente);
  assertFila(fila);
  const tareaKey = `carta-${randomUUID()}`;
  const sb = createServiceClient();
  const { error } = await sb.from(ESTADO).insert({
    feuille,
    tarea_key: tareaKey,
    creada: true,
    componente,
    fila,
    orden,
    nombre: nullable(nombre),
  });
  if (error) throw new Error(error.message);
  return tareaKey;
}

/** Supprime une carte : créée → DELETE (+ enlaces) ; par défaut → masquée. */
export async function roadmapEliminarCarta(
  feuille: string,
  tareaKey: string,
  creada: boolean,
): Promise<void> {
  assertAdmin();
  assertFeuille(feuille);
  assertKey(tareaKey);
  const sb = createServiceClient();
  if (creada) {
    const { error } = await sb.from(ESTADO).delete().eq("feuille", feuille).eq("tarea_key", tareaKey);
    if (error) throw new Error(error.message);
    // Nettoie les dépendances qui référencent la carte supprimée.
    await sb.from(ENLACE).delete().eq("feuille", feuille).or(`desde.eq.${tareaKey},hacia.eq.${tareaKey}`);
    return;
  }
  const { error } = await sb
    .from(ESTADO)
    .upsert({ feuille, tarea_key: tareaKey, oculta: true }, { onConflict: "feuille,tarea_key" });
  if (error) throw new Error(error.message);
}

/** Déplace une carte : nouvelle fila (phase/semestre) + orden (drag-drop). */
export async function roadmapMoverCarta(
  feuille: string,
  tareaKey: string,
  fila: string,
  orden: number,
): Promise<void> {
  assertAdmin();
  assertFeuille(feuille);
  assertKey(tareaKey);
  assertFila(fila);
  const sb = createServiceClient();
  const { error } = await sb
    .from(ESTADO)
    .upsert({ feuille, tarea_key: tareaKey, fila, orden }, { onConflict: "feuille,tarea_key" });
  if (error) throw new Error(error.message);
}

const UNIDADES_VALIDAS = new Set(["dia", "semana", "mes"]);

/**
 * Planification d'une tâche : fecha_inicio / fecha_fin / durée estimée
 * (dur_valor + dur_unidad). Champs INDÉPENDANTS ; seuls ceux présents dans
 * `patch` sont écrits (upsert partiel). Vide/null → NULL.
 */
export async function roadmapSetPlan(
  feuille: string,
  tareaKey: string,
  patch: {
    fechaInicio?: string | null;
    fechaFin?: string | null;
    durValor?: number | null;
    durUnidad?: string | null;
  },
): Promise<void> {
  assertAdmin();
  assertFeuille(feuille);
  assertKey(tareaKey);
  const row: Record<string, unknown> = { feuille, tarea_key: tareaKey };
  if ("fechaInicio" in patch) row.fecha_inicio = nullable(patch.fechaInicio);
  if ("fechaFin" in patch) row.fecha_fin = nullable(patch.fechaFin);
  if ("durValor" in patch) {
    const v = patch.durValor;
    row.dur_valor = v == null || Number.isNaN(v) || v <= 0 ? null : Math.trunc(v);
  }
  if ("durUnidad" in patch) {
    row.dur_unidad = patch.durUnidad && UNIDADES_VALIDAS.has(patch.durUnidad) ? patch.durUnidad : null;
  }
  const sb = createServiceClient();
  const { error } = await sb.from(ESTADO).upsert(row, { onConflict: "feuille,tarea_key" });
  if (error) throw new Error(error.message);
}

/** Restaure toutes les cartes par défaut masquées d'une feuille. */
export async function roadmapRestaurarOcultas(feuille: string): Promise<void> {
  assertAdmin();
  assertFeuille(feuille);
  const sb = createServiceClient();
  const { error } = await sb
    .from(ESTADO)
    .update({ oculta: false })
    .eq("feuille", feuille)
    .eq("oculta", true);
  if (error) throw new Error(error.message);
}

/** Ajoute une dépendance (flèche) desde → hacia. */
export async function roadmapAddEnlace(
  feuille: string,
  desde: string,
  hacia: string,
): Promise<void> {
  assertAdmin();
  assertFeuille(feuille);
  assertKey(desde);
  assertKey(hacia);
  if (desde === hacia) return;
  const sb = createServiceClient();
  const { error } = await sb
    .from(ENLACE)
    .upsert({ feuille, desde, hacia }, { onConflict: "feuille,desde,hacia", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}

/** Supprime une dépendance. */
export async function roadmapRemoveEnlace(
  feuille: string,
  desde: string,
  hacia: string,
): Promise<void> {
  assertAdmin();
  assertFeuille(feuille);
  const sb = createServiceClient();
  const { error } = await sb
    .from(ENLACE)
    .delete()
    .eq("feuille", feuille)
    .eq("desde", desde)
    .eq("hacia", hacia);
  if (error) throw new Error(error.message);
}
