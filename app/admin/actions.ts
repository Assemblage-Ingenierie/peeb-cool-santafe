"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { GP_TABLE, GP_SELECT, type GpRow } from "@/lib/admin/gp";

// ============================================================
// Server Actions — CRUD Documentación GP (écriture admin, sans cache).
// Chaque action vérifie l'autorisation (Server Functions = POST direct possible).
// UID des nouvelles lignes généré CÔTÉ SERVEUR (max + 1 par table).
// ============================================================

function assertAdmin() {
  // En dev : bypass mock admin. En prod (Étape 6) : session réelle.
  if (!isAdmin(getCurrentUser())) {
    throw new Error("No autorizado");
  }
}

const EDITABLE_FIELDS = new Set(["nombre_documento", "url"]);
const FLAGS = new Set(["confidencial", "publicar"]);

/** Crée une ligne vide avec un UID incrémental (GP-DOC-NNNN). */
export async function addGp(): Promise<GpRow> {
  assertAdmin();
  const sb = createServiceClient();

  const { data: existing, error: readErr } = await sb.from(GP_TABLE).select("uid");
  if (readErr) throw new Error(readErr.message);

  // max numéro existant sur le motif GP-DOC-NNNN (les UID parlants du seed sont ignorés)
  const max = (existing ?? []).reduce((acc, r) => {
    const m = /^GP-DOC-(\d+)$/.exec(String(r.uid));
    return m ? Math.max(acc, Number(m[1])) : acc;
  }, 0);
  const uid = `GP-DOC-${String(max + 1).padStart(4, "0")}`;

  const { data, error } = await sb
    .from(GP_TABLE)
    .insert({ uid, nombre_documento: "", url: null, confidencial: false, publicar: false })
    .select(GP_SELECT)
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  return data as GpRow;
}

/** Met à jour un champ texte éditable (nombre_documento | url). */
export async function updateGpField(uid: string, field: string, value: string): Promise<void> {
  assertAdmin();
  if (!EDITABLE_FIELDS.has(field)) throw new Error(`Campo no editable: ${field}`);

  const clean = field === "url" ? (value.trim() === "" ? null : value.trim()) : value;

  const sb = createServiceClient();
  const { error } = await sb.from(GP_TABLE).update({ [field]: clean }).eq("uid", uid);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}

/** Bascule un drapeau (confidencial | publicar) — axes indépendants. */
export async function setGpFlag(uid: string, flag: string, value: boolean): Promise<void> {
  assertAdmin();
  if (!FLAGS.has(flag)) throw new Error(`Bandera inválida: ${flag}`);

  const sb = createServiceClient();
  const { error } = await sb.from(GP_TABLE).update({ [flag]: value }).eq("uid", uid);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}

export async function deleteGp(uid: string): Promise<void> {
  assertAdmin();
  const sb = createServiceClient();
  const { error } = await sb.from(GP_TABLE).delete().eq("uid", uid);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}
