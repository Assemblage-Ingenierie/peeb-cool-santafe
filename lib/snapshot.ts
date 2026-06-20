import "server-only";
import { createServiceClient } from "@/lib/supabase/server";

// ============================================================
// lib/snapshot.ts — Lecture publique (Dashboard + Mapa) en service_role.
// Source unique de données pour /api/snapshot (Étape 4). `server-only` :
// la clé service_role ne fuit jamais côté client.
//
// Projection FIDÈLE de la base : valeurs brutes, NULL conservés, AUCUN calcul
// dérivé (économie kWh/%/m² calculés à l'affichage via lib/calc.ts). Le filtrage
// d'affichage (agenda à venir, filtre composante) se fait côté composant.
// ============================================================

export type Escenario = "faisabilidad" | "proyecto";

export interface SnapshotSubproyecto {
  uid: string;
  nombre: string;
  tipologia: string; // A | H | E
  seccion: string; // Aeropuertos | Hospitales | Escuelas
  orden: number;
  direccion: string | null;
  lat: number | null;
  lng: number | null;
  superficie_m2: number | null;
  notas: string | null; // HTML restreint déjà assaini en écriture
}

export interface SnapshotMetrica {
  subproyecto_uid: string;
  escenario: Escenario;
  demanda_kwh: number | null;
  demanda_despues_kwh: number | null;
  gei_antes_tco2: number | null;
  gei_despues_tco2: number | null;
  costo_ee_eur: number | null;
  costo_otras_eur: number | null;
  // Scénario `faisabilidad` uniquement (bénéficiaires) — null sur `proyecto`.
  benef_personal: number | null;
  benef_personal_pct_muj: number | null;
  benef_usuarios: number | null;
  benef_usuarios_pct_muj: number | null;
  benef_indirectos: number | null;
  benef_indirectos_pct_muj: number | null;
}

// Étape (tipo_linea='etapa') d'un sous-projet. Sert à : (1) décider quel scénario
// afficher par défaut + activer le toggle quand `proyecto_ejecutivo` est démarrée ;
// (2) futur bloc « Progreso » (CDC §4.1).
export interface SnapshotFase {
  subproyecto_uid: string;
  fase: string; // code (proyecto_ejecutivo, obra, …)
  estado: string | null; // en_proceso | terminado | null
  fecha_inicio: string | null;
  fecha_fin: string | null;
}

export interface SnapshotEvento {
  uid: string;
  nombre: string;
  fecha: string; // YYYY-MM-DD
  hora_inicio: string | null;
  hora_fin: string | null;
  componente: string | null;
  modalidad: string | null;
  lugar: string | null;
  url_conexion: string | null;
  participantes: string[]; // UID bruts (equipo | entidades)
  participantesLabels: string[]; // libellés résolus, même ordre
}

export interface Snapshot {
  generatedAt: string; // ISO — « última actualización » + cache PWA (Étape 5)
  subproyectos: SnapshotSubproyecto[];
  metricas: SnapshotMetrica[];
  fases: SnapshotFase[];
  eventos: SnapshotEvento[];
}

// --- Types bruts (lignes PostgREST) --------------------------------------
type RawEquipo = { uid: string; apellido: string | null; nombre: string | null };
type RawEntidad = { uid: string; nombre: string | null };
type RawEvento = {
  uid: string;
  nombre: string | null;
  fecha: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  componente: string | null;
  modalidad: string | null;
  lugar: string | null;
  url_conexion: string | null;
  participantes: string[] | null;
};

const SUB_COLS =
  "uid, nombre, tipologia, seccion, orden, direccion, lat, lng, superficie_m2, notas";
const METRICA_COLS =
  "subproyecto_uid, escenario, demanda_kwh, demanda_despues_kwh, gei_antes_tco2, gei_despues_tco2, costo_ee_eur, costo_otras_eur, benef_personal, benef_personal_pct_muj, benef_usuarios, benef_usuarios_pct_muj, benef_indirectos, benef_indirectos_pct_muj";

/** Construit le snapshot complet (un seul aller-retour groupé). */
export async function getSnapshot(): Promise<Snapshot> {
  const sb = createServiceClient();

  const [subRes, metRes, faseRes, evtRes, eqRes, entRes] = await Promise.all([
    sb
      .from("peebcoolsf_subproyectos")
      .select(SUB_COLS)
      .order("orden", { ascending: true })
      .order("uid", { ascending: true }),
    sb
      .from("peebcoolsf_metricas")
      .select(METRICA_COLS)
      .order("subproyecto_uid", { ascending: true })
      .order("escenario", { ascending: true }),
    sb
      .from("peebcoolsf_gestion_lineas")
      .select("subproyecto_uid, fase, estado, fecha_inicio, fecha_fin")
      .eq("tipo_linea", "etapa"),
    sb
      .from("peebcoolsf_eventos")
      .select(
        "uid, nombre, fecha, hora_inicio, hora_fin, componente, modalidad, lugar, url_conexion, participantes",
      )
      .order("fecha", { ascending: true })
      .order("hora_inicio", { ascending: true, nullsFirst: false }),
    sb.from("peebcoolsf_equipo").select("uid, apellido, nombre"),
    sb.from("peebcoolsf_entidades").select("uid, nombre"),
  ]);

  const firstError =
    subRes.error || metRes.error || faseRes.error || evtRes.error || eqRes.error || entRes.error;
  if (firstError) {
    throw new Error(`Error al construir el snapshot: ${firstError.message}`);
  }

  // Table de résolution des participants (UID → libellé).
  const labels = new Map<string, string>();
  for (const e of (eqRes.data ?? []) as RawEquipo[]) {
    const full = [(e.apellido ?? "").trim(), (e.nombre ?? "").trim()]
      .filter(Boolean)
      .join(", ");
    labels.set(e.uid, full || e.uid);
  }
  for (const en of (entRes.data ?? []) as RawEntidad[]) {
    labels.set(en.uid, (en.nombre ?? "").trim() || en.uid);
  }

  const eventos: SnapshotEvento[] = ((evtRes.data ?? []) as RawEvento[]).map((e) => {
    const participantes = Array.isArray(e.participantes) ? e.participantes : [];
    return {
      uid: e.uid,
      nombre: e.nombre ?? "",
      fecha: e.fecha,
      hora_inicio: e.hora_inicio,
      hora_fin: e.hora_fin,
      componente: e.componente,
      modalidad: e.modalidad,
      lugar: e.lugar,
      url_conexion: e.url_conexion,
      participantes,
      participantesLabels: participantes.map((uid) => labels.get(uid) ?? uid),
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    subproyectos: (subRes.data ?? []) as unknown as SnapshotSubproyecto[],
    metricas: (metRes.data ?? []) as unknown as SnapshotMetrica[],
    fases: (faseRes.data ?? []) as unknown as SnapshotFase[],
    eventos,
  };
}
