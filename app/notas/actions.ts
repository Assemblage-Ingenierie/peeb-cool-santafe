"use server";

import { randomUUID } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth-server";

// ============================================================
// Server Actions — Notas (whiteboard admin). Écriture en service_role.
// Autorisation admin. Table peebcoolsf_notas.
// ============================================================

const TABLE = "peebcoolsf_notas";
const COLORES = new Set(["blanco", "GP", "EE", "AyS", "G"]);

async function assertAdmin() {
  await requireAdmin();
}

export interface NotaRow {
  id: string;
  titulo: string;
  contenido: string;
  color: string;
  x: number;
  y: number;
}

/** Crée une nota (couleur donnée) et retourne la ligne. */
export async function notaCrear(color: string, x: number, y: number): Promise<NotaRow> {
  await assertAdmin();
  const id = `nota-${randomUUID()}`;
  const col = COLORES.has(color) ? color : "blanco";
  const sb = createServiceClient();
  const { data, error } = await sb
    .from(TABLE)
    .insert({ id, color: col, x: Math.round(x), y: Math.round(y), titulo: "", contenido: "" })
    .select("id, titulo, contenido, color, x, y")
    .single();
  if (error) throw new Error(error.message);
  return data as NotaRow;
}

/** Met à jour une nota (titre / contenu / couleur / position). Champs partiels. */
export async function notaActualizar(
  id: string,
  patch: { titulo?: string; contenido?: string; color?: string; x?: number; y?: number },
): Promise<void> {
  await assertAdmin();
  const row: Record<string, unknown> = {};
  if ("titulo" in patch) row.titulo = patch.titulo ?? "";
  if ("contenido" in patch) row.contenido = patch.contenido ?? "";
  if ("color" in patch) row.color = patch.color && COLORES.has(patch.color) ? patch.color : "blanco";
  if ("x" in patch) row.x = Math.round(patch.x ?? 0);
  if ("y" in patch) row.y = Math.round(patch.y ?? 0);
  if (Object.keys(row).length === 0) return;
  const sb = createServiceClient();
  const { error } = await sb.from(TABLE).update(row).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Supprime une nota. */
export async function notaEliminar(id: string): Promise<void> {
  await assertAdmin();
  const sb = createServiceClient();
  const { error } = await sb.from(TABLE).delete().eq("id", id);
  if (error) throw new Error(error.message);
}
