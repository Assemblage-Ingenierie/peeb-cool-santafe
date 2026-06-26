"use server";

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
