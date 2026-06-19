import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { TABLES } from "./config";

export type Row = { uid: string; [key: string]: unknown };

/** Lecture serveur d'une table Admin (service_role, sans cache). */
export async function listTable(key: string): Promise<Row[]> {
  const cfg = TABLES[key];
  if (!cfg) throw new Error(`Tabla desconocida: ${key}`);

  const sb = createServiceClient();
  let query = sb.from(cfg.table).select(cfg.select);
  for (const o of cfg.orderBy) {
    query = query.order(o.col, { ascending: o.ascending ?? true, nullsFirst: o.nullsFirst });
  }

  const { data, error } = await query;
  if (error) throw new Error(`Error al leer ${cfg.table}: ${error.message}`);
  return (data ?? []) as unknown as Row[];
}
