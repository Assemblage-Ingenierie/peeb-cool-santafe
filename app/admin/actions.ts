"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { TABLES, type TableConfig } from "@/lib/admin/config";
import type { Row } from "@/lib/admin/read";

// ============================================================
// Server Actions génériques (écriture admin, sans cache).
// Validées par liste blanche (config) ; autorisation par action.
// UID des nouvelles lignes généré CÔTÉ SERVEUR (max + 1 par table).
// ============================================================

function assertAdmin() {
  if (!isAdmin(getCurrentUser())) throw new Error("No autorizado");
}

function cfgOf(tableKey: string): TableConfig {
  const cfg = TABLES[tableKey];
  if (!cfg) throw new Error(`Tabla desconocida: ${tableKey}`);
  return cfg;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Crée une ligne vide avec UID incrémental (préfixe + numéro zéro-paddé). */
export async function addRow(tableKey: string): Promise<Row> {
  assertAdmin();
  const cfg = cfgOf(tableKey);
  const sb = createServiceClient();

  const { data: existing, error: readErr } = await sb.from(cfg.table).select("uid");
  if (readErr) throw new Error(readErr.message);

  const re = new RegExp(`^${escapeRe(cfg.uidPrefix)}(\\d+)$`);
  const list = (existing ?? []) as unknown as { uid: string }[];
  const max = list.reduce((acc, r) => {
    const m = re.exec(String(r.uid));
    return m ? Math.max(acc, Number(m[1])) : acc;
  }, 0);
  const uid = cfg.uidPrefix + String(max + 1).padStart(cfg.uidPad, "0");

  const insert: Record<string, unknown> = { uid, ...cfg.defaults };
  if (cfg.todayField) insert[cfg.todayField] = todayISO();

  const { data, error } = await sb.from(cfg.table).insert(insert).select(cfg.select).single();
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  return data as unknown as Row;
}

/** Met à jour un champ scalaire (texte/url/select/date/time). */
export async function updateField(
  tableKey: string,
  uid: string,
  field: string,
  value: string,
): Promise<void> {
  assertAdmin();
  const cfg = cfgOf(tableKey);
  if (!cfg.textFields.includes(field)) throw new Error(`Campo no editable: ${field}`);

  let v: string | null;
  if (value === "") {
    if (cfg.dateFields.includes(field)) return; // date NOT NULL : ignorer une valeur vide
    v = cfg.notNull.includes(field) ? "" : null;
  } else {
    v = field === "url" || field === "url_conexion" ? value.trim() : value;
  }

  const sb = createServiceClient();
  const { error } = await sb.from(cfg.table).update({ [field]: v }).eq("uid", uid);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}

/** Bascule un drapeau (confidencial | publicar). */
export async function setFlag(
  tableKey: string,
  uid: string,
  flag: string,
  value: boolean,
): Promise<void> {
  assertAdmin();
  const cfg = cfgOf(tableKey);
  if (!cfg.flagFields.includes(flag)) throw new Error(`Bandera inválida: ${flag}`);

  const sb = createServiceClient();
  const { error } = await sb.from(cfg.table).update({ [flag]: value }).eq("uid", uid);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}

/** Remplace un champ tableau text[] (participantes, entidades). */
export async function setArrayField(
  tableKey: string,
  uid: string,
  field: string,
  values: string[],
): Promise<void> {
  assertAdmin();
  const cfg = cfgOf(tableKey);
  if (!cfg.arrayFields.includes(field)) throw new Error(`Campo no válido: ${field}`);

  const clean = Array.isArray(values) ? values.filter((x) => typeof x === "string") : [];
  const sb = createServiceClient();
  const { error } = await sb.from(cfg.table).update({ [field]: clean }).eq("uid", uid);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}

export async function deleteRow(tableKey: string, uid: string): Promise<void> {
  assertAdmin();
  const cfg = cfgOf(tableKey);
  const sb = createServiceClient();
  const { error } = await sb.from(cfg.table).delete().eq("uid", uid);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}
