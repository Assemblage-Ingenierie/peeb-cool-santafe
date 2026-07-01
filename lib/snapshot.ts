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
  ays_texto: string | null; // texte libre « Requisitos AyS » (CDC §4.5)
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
// (2) bloc « Progreso » (CDC §4.1).
export interface SnapshotFase {
  subproyecto_uid: string;
  fase: string; // code (proyecto_ejecutivo, obra, …)
  estado: string | null; // en_proceso | terminado | null
  fecha_inicio: string | null;
  fecha_fin: string | null;
}

// Document (tipo_linea='documento' ou vide) d'un sous-projet — bloc « Documentos ».
export interface SnapshotDocumento {
  uid: string;
  subproyecto_uid: string;
  titulo: string;
  url: string | null;
  componente: string | null; // GP | EE | AyS | G | null
  estado: string | null;
  orden: number | null;
}

// Document de « Documentación de proyecto » (documentacion_gp) — bloc Documentos
// du mode Proyecto global, groupé par composante (GP/EE/AyS/G).
export interface SnapshotDocProyecto {
  uid: string;
  nombre: string;
  url: string | null;
  componente: string | null;
  publicar: boolean;
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
  formacion: boolean; // case « Formación » (CDC §4.3)
  url_documento: string | null; // document associé (CDC §4.3)
  participantes: string[]; // UID bruts (equipo | entidades)
  participantesLabels: string[]; // libellés résolus, même ordre
}

// Mesure du projet (table peebcoolsf_medidas) — blocs « Medidas » du mode
// Subproyectos (CDC §4.1/§4.5). À l'affichage : seules les mesures `activa` sont montrées.
export interface SnapshotMedida {
  subproyecto_uid: string;
  medida: string; // code (voir MEDIDAS dans lib/constants)
  componente: string | null; // EE | G | AyS | null
  activa: boolean;
  texto: string | null;
  kwh_anual: number | null; // null pour AyS (jamais de kWh)
  orden: number;
}

// Personne sélectionnable comme participante d'un evento (equipo OU entidad) —
// alimente le sélecteur de participants du formulaire Calendario (sous-lot 3b).
export interface SnapshotPersona {
  uid: string;
  label: string;
  tipo: "equipo" | "entidad";
}

// Journal d'activité du Calendario (table peebcoolsf_eventos_actividad) : créations
// et suppressions faites depuis la page Calendario (self-service). Alimente l'alerte
// « +N » de l'Inicio (CDC §4.3 — ajout demandé : prévenir l'admin des suppressions).
export interface SnapshotActividad {
  id: string;
  tipo: "creado" | "eliminado";
  eventoUid: string;
  eventoNombre: string;
  eventoFecha: string | null; // YYYY-MM-DD
  creadoEn: string; // ISO (timestamptz)
}

// Requisitos AyS cochés (table peebcoolsf_ays_requisitos) — uniquement les actifs.
// Libellés/groupes résolus côté UI via REQUISITOS_AYS (lib/constants).
export interface SnapshotAysRequisito {
  subproyectoUid: string;
  requisito: string; // code § (ex. "10.5.1")
}

// Hojas de ruta — état d'édition persisté (table peebcoolsf_roadmap_estado).
// `feuille` = 'global' | uid sous-projet ; `tareaKey` = clé de carte
// (ou '__ano_afd__' pour la case « No objeción AFD recibida »).
export interface SnapshotRoadmapEstado {
  feuille: string;
  tareaKey: string;
  realizada: boolean;
  comentario: string | null;
  nombre: string | null;
  descripcion: string | null;
  responsable: string | null;
  oculta: boolean; // carte par défaut masquée sur cette feuille
  fila: string | null; // override de phase/semestre (null = fila d'origine)
  orden: number | null; // clé de tri dans la colonne (null = ordre par défaut)
  componente: string | null; // composante d'une carte créée (null = carte par défaut)
  creada: boolean; // true = carte ajoutée à la main (tarea_key = UID)
  fechaInicio: string | null; // planification (date ISO) — indépendante
  fechaFin: string | null; // planification (date ISO) — indépendante (saisie en Admin)
  durValor: number | null; // durée estimée : quantité
  durUnidad: string | null; // durée estimée : unité (dia|semana|mes)
}

// Hojas de ruta — dépendances (flèches) persistées (table peebcoolsf_roadmap_enlace).
export interface SnapshotRoadmapEnlace {
  feuille: string;
  desde: string;
  hacia: string;
}

export interface Snapshot {
  generatedAt: string; // ISO — « última actualización » + cache PWA (Étape 5)
  subproyectos: SnapshotSubproyecto[];
  metricas: SnapshotMetrica[];
  fases: SnapshotFase[];
  documentos: SnapshotDocumento[];
  docsProyecto: SnapshotDocProyecto[];
  eventos: SnapshotEvento[];
  medidas: SnapshotMedida[];
  personas: SnapshotPersona[];
  actividadEventos: SnapshotActividad[];
  aysRequisitos: SnapshotAysRequisito[];
  roadmapEstado: SnapshotRoadmapEstado[];
  roadmapEnlace: SnapshotRoadmapEnlace[];
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
  formacion: boolean | null;
  url_documento: string | null;
  participantes: string[] | null;
};
type RawGestion = {
  uid: string;
  subproyecto_uid: string;
  titulo: string | null;
  url: string | null;
  componente: string | null;
  estado: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  fase: string | null;
  tipo_linea: string | null;
  orden: number | null;
  publicar: boolean | null;
};
type RawDocGp = {
  uid: string;
  nombre_documento: string | null;
  url: string | null;
  componente: string | null;
  publicar: boolean | null;
};
type RawActividad = {
  id: string;
  tipo: string;
  evento_uid: string;
  evento_nombre: string | null;
  evento_fecha: string | null;
  creado_en: string;
};

const SUB_COLS =
  "uid, nombre, tipologia, seccion, orden, direccion, lat, lng, superficie_m2, notas, ays_texto";
const METRICA_COLS =
  "subproyecto_uid, escenario, demanda_kwh, demanda_despues_kwh, gei_antes_tco2, gei_despues_tco2, costo_ee_eur, costo_otras_eur, benef_personal, benef_personal_pct_muj, benef_usuarios, benef_usuarios_pct_muj, benef_indirectos, benef_indirectos_pct_muj";
const GESTION_COLS =
  "uid, subproyecto_uid, titulo, url, componente, estado, fecha_inicio, fecha_fin, fase, tipo_linea, orden, publicar";
const DOCGP_COLS = "uid, nombre_documento, url, componente, publicar, orden";
const MEDIDA_COLS = "subproyecto_uid, medida, componente, activa, texto, kwh_anual, orden";

/** Construit le snapshot complet (un seul aller-retour groupé). */
export async function getSnapshot(): Promise<Snapshot> {
  const sb = createServiceClient();

  const [
    subRes,
    metRes,
    gestRes,
    evtRes,
    eqRes,
    entRes,
    docGpRes,
    medRes,
    actRes,
    aysReqRes,
    rmEstadoRes,
    rmEnlaceRes,
  ] = await Promise.all([
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
    // Toutes les lignes gestion_lineas (fases + documents) en une fois ; split en JS.
    sb
      .from("peebcoolsf_gestion_lineas")
      .select(GESTION_COLS)
      .order("orden", { ascending: true, nullsFirst: false })
      .order("uid", { ascending: true }),
    sb
      .from("peebcoolsf_eventos")
      .select(
        "uid, nombre, fecha, hora_inicio, hora_fin, componente, modalidad, lugar, url_conexion, formacion, url_documento, participantes",
      )
      .order("fecha", { ascending: true })
      .order("hora_inicio", { ascending: true, nullsFirst: false }),
    sb.from("peebcoolsf_equipo").select("uid, apellido, nombre"),
    sb.from("peebcoolsf_entidades").select("uid, nombre"),
    // publicar : seuls les documents publiés sont exposés sur les pages publiques
    // (filtré à la SOURCE → jamais affichés ni présents dans le JSON public).
    sb
      .from("peebcoolsf_documentacion_gp")
      .select(DOCGP_COLS)
      .eq("publicar", true)
      .order("orden", { ascending: true, nullsFirst: false })
      .order("uid", { ascending: true }),
    sb
      .from("peebcoolsf_medidas")
      .select(MEDIDA_COLS)
      .order("subproyecto_uid", { ascending: true })
      .order("orden", { ascending: true }),
    // Journal d'activité Calendario (créations/suppressions self-service) — récent.
    sb
      .from("peebcoolsf_eventos_actividad")
      .select("id, tipo, evento_uid, evento_nombre, evento_fecha, creado_en")
      .order("creado_en", { ascending: false })
      .limit(100),
    // Requisitos AyS cochés (CDC §4.5) — seuls les actifs sortent.
    sb.from("peebcoolsf_ays_requisitos").select("subproyecto_uid, requisito").eq("activa", true),
    // Hojas de ruta : état d'édition + dépendances (toutes lignes).
    sb
      .from("peebcoolsf_roadmap_estado")
      .select(
        "feuille, tarea_key, realizada, comentario, nombre, descripcion, responsable, oculta, fila, orden, componente, creada, fecha_inicio, fecha_fin, dur_valor, dur_unidad",
      ),
    sb.from("peebcoolsf_roadmap_enlace").select("feuille, desde, hacia"),
  ]);

  const firstError =
    subRes.error ||
    metRes.error ||
    gestRes.error ||
    evtRes.error ||
    eqRes.error ||
    entRes.error ||
    docGpRes.error ||
    medRes.error ||
    actRes.error ||
    aysReqRes.error ||
    rmEstadoRes.error ||
    rmEnlaceRes.error;
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

  // Liste sélectionnable (equipo + entidades), pour le picker de participants.
  // Tri : équipe d'abord, entités ensuite, chaque groupe par libellé (es-AR).
  const personas: SnapshotPersona[] = [
    ...((eqRes.data ?? []) as RawEquipo[]).map(
      (e): SnapshotPersona => ({ uid: e.uid, label: labels.get(e.uid) ?? e.uid, tipo: "equipo" }),
    ),
    ...((entRes.data ?? []) as RawEntidad[]).map(
      (en): SnapshotPersona => ({ uid: en.uid, label: labels.get(en.uid) ?? en.uid, tipo: "entidad" }),
    ),
  ].sort((a, b) =>
    a.tipo === b.tipo ? a.label.localeCompare(b.label, "es") : a.tipo === "equipo" ? -1 : 1,
  );

  const actividadEventos: SnapshotActividad[] = ((actRes.data ?? []) as RawActividad[]).map((a) => ({
    id: a.id,
    tipo: a.tipo === "eliminado" ? "eliminado" : "creado",
    eventoUid: a.evento_uid,
    eventoNombre: a.evento_nombre ?? "",
    eventoFecha: a.evento_fecha,
    creadoEn: a.creado_en,
  }));

  const aysRequisitos: SnapshotAysRequisito[] = (
    (aysReqRes.data ?? []) as { subproyecto_uid: string; requisito: string }[]
  ).map((r) => ({ subproyectoUid: r.subproyecto_uid, requisito: r.requisito }));

  const roadmapEstado: SnapshotRoadmapEstado[] = (
    (rmEstadoRes.data ?? []) as {
      feuille: string;
      tarea_key: string;
      realizada: boolean | null;
      comentario: string | null;
      nombre: string | null;
      descripcion: string | null;
      responsable: string | null;
      oculta: boolean | null;
      fila: string | null;
      orden: number | null;
      componente: string | null;
      creada: boolean | null;
      fecha_inicio: string | null;
      fecha_fin: string | null;
      dur_valor: number | null;
      dur_unidad: string | null;
    }[]
  ).map((r) => ({
    feuille: r.feuille,
    tareaKey: r.tarea_key,
    realizada: !!r.realizada,
    comentario: r.comentario,
    nombre: r.nombre,
    descripcion: r.descripcion,
    responsable: r.responsable,
    oculta: !!r.oculta,
    fila: r.fila,
    orden: r.orden,
    componente: r.componente,
    creada: !!r.creada,
    fechaInicio: r.fecha_inicio,
    fechaFin: r.fecha_fin,
    durValor: r.dur_valor,
    durUnidad: r.dur_unidad,
  }));

  const roadmapEnlace: SnapshotRoadmapEnlace[] = (
    (rmEnlaceRes.data ?? []) as { feuille: string; desde: string; hacia: string }[]
  ).map((r) => ({ feuille: r.feuille, desde: r.desde, hacia: r.hacia }));

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
      formacion: !!e.formacion,
      url_documento: e.url_documento,
      participantes,
      participantesLabels: participantes.map((uid) => labels.get(uid) ?? uid),
    };
  });

  // Split gestion_lineas : fases (etapa) vs documentos (documento ou vide).
  const gestRows = (gestRes.data ?? []) as unknown as RawGestion[];
  const fases: SnapshotFase[] = gestRows
    .filter((r) => r.tipo_linea === "etapa")
    .map((r) => ({
      subproyecto_uid: r.subproyecto_uid,
      fase: r.fase ?? "",
      estado: r.estado,
      fecha_inicio: r.fecha_inicio,
      fecha_fin: r.fecha_fin,
    }));
  // Documents de sous-projet : seuls les publiés (publicar=true) sont exposés
  // publiquement, comme la « Documentación de proyecto » ci-dessus.
  const documentos: SnapshotDocumento[] = gestRows
    .filter((r) => r.tipo_linea !== "etapa" && r.publicar === true)
    .map((r) => ({
      uid: r.uid,
      subproyecto_uid: r.subproyecto_uid,
      titulo: r.titulo ?? "",
      url: r.url,
      componente: r.componente,
      estado: r.estado,
      orden: r.orden,
    }));

  const docsProyecto: SnapshotDocProyecto[] = ((docGpRes.data ?? []) as unknown as RawDocGp[]).map(
    (d) => ({
      uid: d.uid,
      nombre: d.nombre_documento ?? "",
      url: d.url,
      componente: d.componente,
      publicar: !!d.publicar,
    }),
  );

  return {
    generatedAt: new Date().toISOString(),
    subproyectos: (subRes.data ?? []) as unknown as SnapshotSubproyecto[],
    metricas: (metRes.data ?? []) as unknown as SnapshotMetrica[],
    fases,
    documentos,
    docsProyecto,
    eventos,
    medidas: (medRes.data ?? []) as unknown as SnapshotMedida[],
    personas,
    actividadEventos,
    aysRequisitos,
    roadmapEstado,
    roadmapEnlace,
  };
}
