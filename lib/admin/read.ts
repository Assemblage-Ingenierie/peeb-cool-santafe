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

// --- Gestión de subproyectos (lectures hors couche « liste » générique) -------

export type Escenario = "faisabilidad" | "proyecto";

export type SubproyectoRow = {
  uid: string;
  nombre: string;
  tipologia: string;
  seccion: string;
  orden: number;
  direccion: string | null;
  lat: number | null;
  lng: number | null;
  superficie_m2: number | null;
  notas: string | null;
  ays_texto: string | null;
};

export type MetricaRow = {
  subproyecto_uid: string;
  escenario: Escenario;
  demanda_kwh: number | null;
  demanda_despues_kwh: number | null;
  gei_antes_tco2: number | null;
  gei_despues_tco2: number | null;
  costo_ee_eur: number | null;
  costo_otras_eur: number | null;
  benef_personal: number | null;
  benef_personal_pct_muj: number | null;
  benef_usuarios: number | null;
  benef_usuarios_pct_muj: number | null;
  benef_indirectos: number | null;
  benef_indirectos_pct_muj: number | null;
};

const METRICA_COLS =
  "subproyecto_uid, escenario, demanda_kwh, demanda_despues_kwh, gei_antes_tco2, gei_despues_tco2, costo_ee_eur, costo_otras_eur, benef_personal, benef_personal_pct_muj, benef_usuarios, benef_usuarios_pct_muj, benef_indirectos, benef_indirectos_pct_muj";

/** Sous-projets (édition « Datos del edificio »), ordonnés. */
export async function listSubproyectos(): Promise<SubproyectoRow[]> {
  const sb = createServiceClient();
  const { data, error } = await sb
    .from("peebcoolsf_subproyectos")
    .select("uid, nombre, tipologia, seccion, orden, direccion, lat, lng, superficie_m2, notas, ays_texto")
    .order("orden", { ascending: true })
    .order("uid", { ascending: true });
  if (error) throw new Error(`Error al leer subproyectos: ${error.message}`);
  return (data ?? []) as unknown as SubproyectoRow[];
}

/** Métriques (1 ligne par sous-projet × escenario : faisabilidad / proyecto). */
export async function listMetricas(): Promise<MetricaRow[]> {
  const sb = createServiceClient();
  const { data, error } = await sb
    .from("peebcoolsf_metricas")
    .select(METRICA_COLS)
    .order("subproyecto_uid", { ascending: true })
    .order("escenario", { ascending: true });
  if (error) throw new Error(`Error al leer metricas: ${error.message}`);
  return (data ?? []) as unknown as MetricaRow[];
}

export type MedidaRow = {
  subproyecto_uid: string;
  medida: string;
  componente: string | null;
  activa: boolean;
  texto: string | null;
  kwh_anual: number | null;
  orden: number;
};

/** Mesures du projet (9 par sous-projet, table peebcoolsf_medidas), ordonnées. */
export async function listMedidas(): Promise<MedidaRow[]> {
  const sb = createServiceClient();
  const { data, error } = await sb
    .from("peebcoolsf_medidas")
    .select("subproyecto_uid, medida, componente, activa, texto, kwh_anual, orden")
    .order("subproyecto_uid", { ascending: true })
    .order("orden", { ascending: true });
  if (error) throw new Error(`Error al leer medidas: ${error.message}`);
  return (data ?? []) as unknown as MedidaRow[];
}

export type AysRequisitoRow = {
  subproyecto_uid: string;
  requisito: string;
  activa: boolean;
};

/** Requisitos AyS (17 plans par sous-projet, table peebcoolsf_ays_requisitos). */
export async function listAysRequisitos(): Promise<AysRequisitoRow[]> {
  const sb = createServiceClient();
  const { data, error } = await sb
    .from("peebcoolsf_ays_requisitos")
    .select("subproyecto_uid, requisito, activa");
  if (error) throw new Error(`Error al leer ays_requisitos: ${error.message}`);
  return (data ?? []) as unknown as AysRequisitoRow[];
}

export type RoadmapEstadoRow = {
  feuille: string;
  tarea_key: string;
  oculta: boolean;
  creada: boolean;
  componente: string | null;
  fila: string | null;
  orden: number | null;
  nombre: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  dur_valor: number | null;
  dur_unidad: string | null;
};

/**
 * État de la feuille de route (toutes feuilles). Sert à afficher les tâches
 * (cartes) par fase dans l'Admin, synchronisées avec Hojas de ruta.
 */
export async function listRoadmapEstado(): Promise<RoadmapEstadoRow[]> {
  const sb = createServiceClient();
  const { data, error } = await sb
    .from("peebcoolsf_roadmap_estado")
    .select(
      "feuille, tarea_key, oculta, creada, componente, fila, orden, nombre, fecha_inicio, fecha_fin, dur_valor, dur_unidad",
    );
  if (error) throw new Error(`Error al leer roadmap_estado: ${error.message}`);
  return (data ?? []) as unknown as RoadmapEstadoRow[];
}
