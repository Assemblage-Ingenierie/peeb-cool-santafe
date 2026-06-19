import "server-only";
import { createServiceClient } from "@/lib/supabase/server";

// Documentación de proyecto (peebcoolsf_documentacion_gp) — lecture serveur, sans cache.

export interface GpRow {
  uid: string;
  nombre_documento: string;
  url: string | null;
  confidencial: boolean;
  publicar: boolean;
  orden: number | null;
  // Signature d'index : compatibilité avec AdminRow (accès colonne dynamique).
  [key: string]: unknown;
}

export const GP_TABLE = "peebcoolsf_documentacion_gp";
export const GP_SELECT = "uid, nombre_documento, url, confidencial, publicar, orden";

export async function listGp(): Promise<GpRow[]> {
  const sb = createServiceClient();
  const { data, error } = await sb
    .from(GP_TABLE)
    .select(GP_SELECT)
    .order("orden", { ascending: true, nullsFirst: false })
    .order("uid", { ascending: true });

  if (error) throw new Error(`Error al leer ${GP_TABLE}: ${error.message}`);
  return (data ?? []) as GpRow[];
}
