"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { TABLES, type TableConfig } from "@/lib/admin/config";
import type { Row, SubproyectoRow } from "@/lib/admin/read";
import { FASES } from "@/lib/constants";

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

/**
 * Parse une valeur numérique éditée. Vide → NULL (jamais 0). « 0 » → 0 (valeur réelle).
 * Accepte la virgule décimale. `integer` tronque (colonnes integer).
 */
function parseNullableNumber(value: string, integer = false): number | null {
  const t = String(value ?? "").trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isFinite(n)) throw new Error(`Número inválido: ${value}`);
  return integer ? Math.trunc(n) : n;
}

/**
 * Backstop serveur pour le HTML de `notas` (l'assainissement principal est côté client).
 * Retire les éléments/handlers dangereux et ne conserve que <strong>/<b>/<br>/<span>.
 */
function sanitizeNotasServer(html: string): string {
  return String(html ?? "")
    .replace(/<\s*\/?\s*(script|style|iframe|img|svg|object|embed|link|meta|form|input)\b[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/<(?!\/?(?:strong|b|br|span)\b)[^>]*>/gi, "")
    .trim();
}

/**
 * Crée une ligne vide avec UID incrémental (préfixe + numéro zéro-paddé).
 * `presets` permet de préremplir des champs (ex. subseccion du bloc), validés par liste blanche.
 */
export async function addRow(tableKey: string, presets?: Record<string, unknown>): Promise<Row> {
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
  if (presets) {
    const allowed = new Set([...cfg.textFields, ...cfg.flagFields, ...cfg.arrayFields]);
    for (const [k, v] of Object.entries(presets)) {
      if (allowed.has(k)) insert[k] = v;
    }
  }
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

/**
 * Supprime une ligne et nettoie les références orphelines :
 * - persona (equipo) → retirée de eventos.participantes[] ;
 * - entidad → equipo.entidad_uid mis à NULL (lève le blocage FK) + retirée de eventos.participantes[].
 */
export async function deleteRow(tableKey: string, uid: string): Promise<void> {
  assertAdmin();
  const cfg = cfgOf(tableKey);
  const sb = createServiceClient();

  // Entidad : détacher AVANT le delete (FK equipo.entidad_uid → entidades.uid).
  if (tableKey === "entidades") await detachEntidad(sb, uid);

  const { error } = await sb.from(cfg.table).delete().eq("uid", uid);
  if (error) throw new Error(error.message);

  // Persona : ses participations sont des text[] (pas de FK) → nettoyer après le delete.
  if (tableKey === "equipo") {
    await removeFromArray(sb, "peebcoolsf_eventos", "participantes", uid);
  }

  revalidatePath("/admin");
}

/** Retire `uid` d'une colonne text[] sur toutes les lignes qui le contiennent. */
async function removeFromArray(
  sb: SupabaseClient,
  table: string,
  column: string,
  uid: string,
): Promise<void> {
  const { data, error } = await sb.from(table).select(`uid, ${column}`).contains(column, [uid]);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as { uid: string; [k: string]: string[] | string }[];
  for (const row of rows) {
    const next = ((row[column] as string[]) ?? []).filter((x) => x !== uid);
    const { error: upErr } = await sb.from(table).update({ [column]: next }).eq("uid", row.uid);
    if (upErr) throw new Error(upErr.message);
  }
}

/** Détache une entidad de toutes ses références avant suppression. */
async function detachEntidad(sb: SupabaseClient, entidadUid: string): Promise<void> {
  const { error } = await sb
    .from("peebcoolsf_equipo")
    .update({ entidad_uid: null })
    .eq("entidad_uid", entidadUid);
  if (error) throw new Error(error.message);
  // Une entidad peut être participante d'un evento (Calendario) → la retirer aussi.
  await removeFromArray(sb, "peebcoolsf_eventos", "participantes", entidadUid);
}

// ============================================================
// Gestión de subproyectos — actions dédiées
// (subproyectos = édition par champ ; metricas = clé (subproyecto × escenario) ;
//  gestion_lineas = UID per-subproyecto + drag & drop).
// ============================================================

const SUB_TEXT = new Set(["nombre", "direccion", "tipologia"]);
const SUB_NUM = new Set(["lat", "lng", "superficie_m2"]);
const SUB_NOTNULL = new Set(["nombre", "tipologia"]);
const TIPOLOGIAS_CODES = new Set(["A", "H", "E"]);

/** Met à jour un champ de « Datos del edificio » (texte ou numérique nullable). */
export async function updateSubproyecto(uid: string, field: string, value: string): Promise<void> {
  assertAdmin();
  let v: string | number | null;

  if (SUB_TEXT.has(field)) {
    const t = (value ?? "").trim();
    if (t === "") {
      if (SUB_NOTNULL.has(field)) return; // ne pas vider un champ requis
      v = null;
    } else {
      if (field === "tipologia" && !TIPOLOGIAS_CODES.has(t)) throw new Error(`Tipología inválida: ${t}`);
      v = t;
    }
  } else if (SUB_NUM.has(field)) {
    v = parseNullableNumber(value);
  } else if (field === "notas") {
    const clean = sanitizeNotasServer(value);
    v = clean === "" ? null : clean;
  } else {
    throw new Error(`Campo no editable: ${field}`);
  }

  const sb = createServiceClient();
  const { error } = await sb.from("peebcoolsf_subproyectos").update({ [field]: v }).eq("uid", uid);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

const METRICA_INT = new Set(["benef_personal", "benef_usuarios", "benef_indirectos"]);
const METRICA_FLOAT = new Set([
  "demanda_kwh",
  "demanda_despues_kwh",
  "gei_antes_tco2",
  "gei_despues_tco2",
  "costo_ee_eur",
  "costo_otras_eur",
  "benef_personal_pct_muj",
  "benef_usuarios_pct_muj",
  "benef_indirectos_pct_muj",
]);
const METRICA_BENEF = new Set([
  "benef_personal",
  "benef_personal_pct_muj",
  "benef_usuarios",
  "benef_usuarios_pct_muj",
  "benef_indirectos",
  "benef_indirectos_pct_muj",
]);

/** Met à jour un champ numérique d'une métrique (clé : subproyecto_uid × escenario). */
export async function updateMetrica(
  subproyectoUid: string,
  escenario: string,
  field: string,
  value: string,
): Promise<void> {
  assertAdmin();
  if (escenario !== "faisabilidad" && escenario !== "proyecto") {
    throw new Error(`Escenario inválido: ${escenario}`);
  }
  const isInt = METRICA_INT.has(field);
  if (!isInt && !METRICA_FLOAT.has(field)) throw new Error(`Campo no editable: ${field}`);
  if (escenario === "proyecto" && METRICA_BENEF.has(field)) {
    throw new Error("Los beneficiarios solo aplican al escenario de faisabilidad");
  }

  const v = parseNullableNumber(value, isInt);
  const sb = createServiceClient();
  const { error } = await sb
    .from("peebcoolsf_metricas")
    .update({ [field]: v })
    .eq("subproyecto_uid", subproyectoUid)
    .eq("escenario", escenario);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

/**
 * Ajoute une école (nouveau sous-projet, tipología E, sección Escuelas).
 * UID auto-généré `SUB-ESC-NNN` (incrémental, par max+1).
 * Crée aussi les 2 lignes metricas (faisabilidad + proyecto) vides ; gestion_lineas démarre vide.
 */
export async function addSchool(nombre: string): Promise<{ sub: SubproyectoRow; fases: Row[] }> {
  assertAdmin();
  const sb = createServiceClient();
  const nom = (nombre ?? "").trim() || "Nueva escuela";

  const { data: allSubs, error: readErr } = await sb.from("peebcoolsf_subproyectos").select("uid, orden");
  if (readErr) throw new Error(readErr.message);
  const subs = (allSubs ?? []) as unknown as { uid: string; orden: number }[];

  const re = /^SUB-ESC-(\d+)$/;
  const maxN = subs.reduce((a, r) => {
    const m = re.exec(r.uid);
    return m ? Math.max(a, Number(m[1])) : a;
  }, 0);
  const uid = `SUB-ESC-${String(maxN + 1).padStart(3, "0")}`;
  if (subs.some((s) => s.uid === uid)) throw new Error(`El subproyecto ${uid} ya existe`);

  const maxOrden = subs.reduce((a, r) => Math.max(a, r.orden ?? 0), 0);

  const { data: ins, error } = await sb
    .from("peebcoolsf_subproyectos")
    .insert({ uid, nombre: nom, tipologia: "E", seccion: "Escuelas", orden: maxOrden + 1 })
    .select("uid, nombre, tipologia, seccion, orden, direccion, lat, lng, superficie_m2, notas")
    .single();
  if (error) throw new Error(error.message);

  const { error: mErr } = await sb.from("peebcoolsf_metricas").insert([
    { subproyecto_uid: uid, escenario: "faisabilidad" },
    { subproyecto_uid: uid, escenario: "proyecto" },
  ]);
  if (mErr) throw new Error(mErr.message);

  // Lignes de fase (etapa) pré-remplies, une par fase (ordre chronologique de FASES).
  const subCode = uid.replace(/^SUB-/, "");
  const faseRows = FASES.map((f, i) => ({
    uid: `GEST-${subCode}-${f.code}`,
    subproyecto_uid: uid,
    titulo: f.nombre,
    orden: i + 1,
    tipo_linea: "etapa",
    fase: f.code,
  }));
  const { data: faseData, error: fErr } = await sb
    .from("peebcoolsf_gestion_lineas")
    .insert(faseRows)
    .select(TABLES.gestion.select);
  if (fErr) throw new Error(fErr.message);

  revalidatePath("/admin");
  return { sub: ins as unknown as SubproyectoRow, fases: (faseData ?? []) as unknown as Row[] };
}

/**
 * Supprime une école (et ses metricas + gestion_lineas). Garde-fou : SEULES les
 * écoles (seccion='Escuelas') sont supprimables — jamais aéroports/hôpitaux.
 */
export async function deleteSubproyecto(uid: string): Promise<void> {
  assertAdmin();
  const sb = createServiceClient();

  const { data, error: readErr } = await sb
    .from("peebcoolsf_subproyectos")
    .select("seccion")
    .eq("uid", uid)
    .maybeSingle();
  if (readErr) throw new Error(readErr.message);
  if (!data) throw new Error(`Subproyecto inexistente: ${uid}`);
  if ((data as { seccion: string }).seccion !== "Escuelas") {
    throw new Error("Solo se pueden eliminar escuelas");
  }

  // Suppressions explicites (indépendantes du ON DELETE CASCADE).
  const delGest = await sb.from("peebcoolsf_gestion_lineas").delete().eq("subproyecto_uid", uid);
  if (delGest.error) throw new Error(delGest.error.message);
  const delMet = await sb.from("peebcoolsf_metricas").delete().eq("subproyecto_uid", uid);
  if (delMet.error) throw new Error(delMet.error.message);
  const delSub = await sb.from("peebcoolsf_subproyectos").delete().eq("uid", uid);
  if (delSub.error) throw new Error(delSub.error.message);

  revalidatePath("/admin");
}

/** Ajoute une ligne de gestion à un sous-projet. UID `GEST-<code>-NNNN` (numéroté par sous-projet). */
export async function addGestionLinea(subproyectoUid: string): Promise<Row> {
  assertAdmin();
  const sb = createServiceClient();
  const code = subproyectoUid.replace(/^SUB-/, "");
  const prefix = `GEST-${code}-`;

  const { data: existing, error: readErr } = await sb
    .from("peebcoolsf_gestion_lineas")
    .select("uid, orden, tipo_linea")
    .eq("subproyecto_uid", subproyectoUid);
  if (readErr) throw new Error(readErr.message);
  const list = (existing ?? []) as unknown as { uid: string; orden: number; tipo_linea: string | null }[];
  // Numéro/orden calculés sur les DOCUMENTS uniquement (les fases ont un UID non numéroté).
  const docs = list.filter((r) => r.tipo_linea !== "etapa");

  const re = new RegExp(`^${escapeRe(prefix)}(\\d+)$`);
  const maxN = docs.reduce((a, r) => {
    const m = re.exec(r.uid);
    return m ? Math.max(a, Number(m[1])) : a;
  }, 0);
  const maxOrden = docs.reduce((a, r) => Math.max(a, r.orden ?? 0), 0);
  const uid = prefix + String(maxN + 1).padStart(TABLES.gestion.uidPad, "0");

  const { data, error } = await sb
    .from("peebcoolsf_gestion_lineas")
    .insert({
      uid,
      subproyecto_uid: subproyectoUid,
      titulo: "",
      orden: maxOrden + 1,
      tipo_linea: "documento",
      confidencial: false,
      publicar: false,
    })
    .select(TABLES.gestion.select)
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  return data as unknown as Row;
}

/** Réécrit la colonne d'ordre (drag & drop) : orden = position+1 dans la liste fournie. */
export async function reorderRows(tableKey: string, orderedUids: string[]): Promise<void> {
  assertAdmin();
  const cfg = cfgOf(tableKey);
  if (!cfg.orderField) throw new Error(`Tabla no ordenable: ${tableKey}`);
  const sb = createServiceClient();

  const results = await Promise.all(
    orderedUids.map((uid, i) =>
      sb.from(cfg.table).update({ [cfg.orderField as string]: i + 1 }).eq("uid", uid),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);

  revalidatePath("/admin");
}
