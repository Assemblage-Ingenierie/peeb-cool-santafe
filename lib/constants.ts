// ============================================================
// lib/constants.ts — SOURCE UNIQUE des couleurs et libellés.
// Aucune couleur de marque ne doit être écrite en dur ailleurs.
// Palette fixée par le CDC (§2.3 composantes / §2.4 typologies) — ne pas l'enrichir.
// ============================================================

import type { CSSProperties } from "react";

// --- Couleurs de texte de référence (règles de contraste, CDC §2.3 / §2.4) ---
const TEXTO_CLARO = "#ffffff"; // texte clair sur fond foncé
const TEXTO_OSCURO = "#272a33"; // texte foncé sur fond clair

export type ComponenteCode = "GP" | "EE" | "AyS" | "G";
export type TipologiaCode = "A" | "H" | "E";

export interface Componente {
  code: ComponenteCode;
  nombre: string;
  color: string; // couleur de fond
  textoClaro: boolean; // true = texte clair sur fond foncé
  onColor: string; // couleur du texte à appliquer sur `color`
}

export interface Tipologia {
  code: TipologiaCode;
  nombre: string;
  color: string;
  textoClaro: boolean;
  onColor: string;
}

// --- Composantes (CDC §2.3) ---
export const COMPONENTES: Componente[] = [
  { code: "GP",  nombre: "Gestión de proyecto",   color: "#30323e", textoClaro: true,  onColor: TEXTO_CLARO },
  { code: "EE",  nombre: "Eficiencia energética", color: "#fff2cc", textoClaro: false, onColor: TEXTO_OSCURO },
  { code: "AyS", nombre: "Ambiental y social",    color: "#d9ead3", textoClaro: false, onColor: TEXTO_OSCURO },
  { code: "G",   nombre: "Género",                color: "#d9d2e9", textoClaro: false, onColor: TEXTO_OSCURO },
];

// --- Typologies de bâtiment (CDC §2.4) ---
export const TIPOLOGIAS: Tipologia[] = [
  { code: "A", nombre: "Aeropuertos", color: "#990000", textoClaro: true, onColor: TEXTO_CLARO },
  { code: "H", nombre: "Hospitales",  color: "#cc0000", textoClaro: true, onColor: TEXTO_CLARO },
  { code: "E", nombre: "Escuelas",    color: "#3c78d8", textoClaro: true, onColor: TEXTO_CLARO },
];

export const getComponente = (code: string): Componente | undefined =>
  COMPONENTES.find((c) => c.code === code);

export const getTipologia = (code: string): Tipologia | undefined =>
  TIPOLOGIAS.find((t) => t.code === code);

// --- Tons des cartes de la feuille de route (Hojas de ruta) ---
// Format de carte validé : EN-TÊTE (nom) / CORPS (description) / PIED (responsable),
// par composante. Nuances DÉRIVÉES des couleurs §2.3 (mêmes familles) — pas de
// nouvelle couleur de marque. Source unique des couleurs de carte de la feuille de route.
export interface CardTono {
  head: string; // fond en-tête
  headText: string; // texte en-tête (nom de la tâche)
  body: string; // fond corps
  bodyText: string; // texte corps (description / référence)
  foot: string; // fond pied (Responsable)
  footText: string; // texte pied
  border: string;
}

export const CARD_TONOS: Record<ComponenteCode, CardTono> = {
  GP:  { head: "#434343", headText: "#ffffff", body: "#ededed", bodyText: "#444444", foot: "#1f1f1f", footText: "#ffffff", border: "#bdbdbd" },
  EE:  { head: "#fff2cc", headText: "#5b4708", body: "#fff8e1", bodyText: "#7a6100", foot: "#bf9000", footText: "#ffffff", border: "#f1c232" },
  AyS: { head: "#d9ead3", headText: "#274e13", body: "#eaf3e5", bodyText: "#3b6d11", foot: "#38761d", footText: "#ffffff", border: "#b6d7a8" },
  G:   { head: "#d9d2e9", headText: "#2b1a5e", body: "#ede9f4", bodyText: "#4b3b86", foot: "#674ea7", footText: "#ffffff", border: "#b4a7d6" },
};

// ============================================================
// Mesures du projet (CDC §4.5) — 8 mesures par sous-projet (table peebcoolsf_medidas).
// (AyS n'est plus une mesure : voir REQUISITOS_AYS / section « Requisitos AyS ».)
// Couleurs = TRAIT du pictogramme, style « ligne sur fond blanc » (validé avec le
// client). Distinctes des pastels de composante (illisibles en trait fin). Source
// unique des libellés/couleurs des mesures.
// ============================================================

export type MedidaCode =
  | "aislacion"
  | "carpinterias"
  | "hvac"
  | "luminarias"
  | "fotovoltaicos"
  | "solar_termica"
  | "genero"
  | "otras";

export interface Medida {
  code: MedidaCode;
  nombre: string; // libellé es (Argentine)
  componente: ComponenteCode | null;
  color: string; // couleur du trait du pictogramme (ou de la lettre)
  tieneKwh: boolean; // false → pas de champ kWh/an (AyS)
  letra?: string; // si défini : rendu en badge-lettre (G / AyS) au lieu d'un picto
}

// Couleurs de trait des pictogrammes (lisibles sur fond blanc).
const MED_EE = "#BF9000"; // 4 mesures EE — doré
const MED_SOLAR = "#e69138"; // photovoltaïque + solaire thermique — orange
const MED_G = "#534AB7"; // género — violet
const MED_OTRAS = "#5F5E5A"; // otras medidas — gris

// Ordre = colonne `orden` de peebcoolsf_medidas (1→9).
export const MEDIDAS: Medida[] = [
  { code: "aislacion",     nombre: "Aislación",          componente: "EE",  color: MED_EE,    tieneKwh: true },
  { code: "carpinterias",  nombre: "Carpinterías",       componente: "EE",  color: MED_EE,    tieneKwh: true },
  { code: "hvac",          nombre: "HVAC",               componente: "EE",  color: MED_EE,    tieneKwh: true },
  { code: "luminarias",    nombre: "Luminarias",         componente: "EE",  color: MED_EE,    tieneKwh: true },
  { code: "fotovoltaicos", nombre: "Fotovoltaicos",      componente: "EE",  color: MED_SOLAR, tieneKwh: true },
  { code: "solar_termica", nombre: "Solar térmica",      componente: "EE",  color: MED_SOLAR, tieneKwh: true },
  { code: "genero",        nombre: "Género",             componente: "G",   color: MED_G,     tieneKwh: false, letra: "G" },
  { code: "otras",         nombre: "Otras medidas",      componente: null,  color: MED_OTRAS, tieneKwh: false },
];

export const getMedida = (code: string): Medida | undefined =>
  MEDIDAS.find((m) => m.code === code);

// ============================================================
// Requisitos AyS (CDC §4.5 — nouveau mécanisme) — checklist de plans/programmes
// du MGAS, groupée en 3 sections (§10.5 / §10.6 / §10.7). Cochés par sous-projet
// (table peebcoolsf_ays_requisitos). Remplace l'ancienne « medida » AyS.
// `code` = numéro § (clé stable en base) ; réf. affichée = « MGAS §<code> ».
// ============================================================

export interface RequisitoAys {
  code: string; // ex. "10.5.1"
  label: string;
}

export interface GrupoRequisitosAys {
  code: string; // ex. "10.5"
  titulo: string;
  requisitos: RequisitoAys[];
}

export const REQUISITOS_AYS: GrupoRequisitosAys[] = [
  {
    code: "10.5",
    titulo: "Planes para la gestión de los aspectos ambientales",
    requisitos: [
      { code: "10.5.1", label: "Plan para la protección de los recursos hídricos" },
      { code: "10.5.2", label: "Plan para el control de emisiones y calidad del aire" },
      { code: "10.5.3", label: "Plan de Manejo de Residuos Peligrosos y no Peligrosos, y Productos peligrosos" },
      { code: "10.5.4", label: "Plan de Eficiencia Energética y de Recursos" },
      { code: "10.5.5", label: "Programa para el control de plagas y vectores" },
      { code: "10.5.6", label: "Programa para la conservación de fauna silvestre en edificios" },
      { code: "10.5.7", label: "Plan de Manejo de Aguas Residuales y Efluentes Domésticos y No Domésticos" },
      { code: "10.5.8", label: "Plan de Manejo de Sustancias Químicas" },
    ],
  },
  {
    code: "10.6",
    titulo: "Programas/planes para la gestión de trabajo, condiciones laborales y SST",
    requisitos: [
      { code: "10.6.1", label: "Lineamientos para el Procedimiento de Gestión Laboral" },
      { code: "10.6.2", label: "Lineamientos para el Plan de salud y seguridad de los trabajadores y de los usuarios de los edificios" },
      { code: "10.6.3", label: "Lineamientos para el Plan de seguridad vial, manejo de tránsito, desvíos internos y accesos a edificios" },
      { code: "10.6.4", label: "Lineamientos para Plan de preparación y respuesta ante situaciones de emergencias de origen antrópico" },
      { code: "10.6.5", label: "Lineamientos para Plan de prevención de contagio por enfermedades infecciosas" },
    ],
  },
  {
    code: "10.7",
    titulo: "Programas/planes para la gestión social",
    requisitos: [
      { code: "10.7.1", label: "Plan de continuidad de servicios para Hospitales" },
      { code: "10.7.2", label: "Plan de Continuidad de Servicios Aeroportuarios" },
      { code: "10.7.3", label: "Plan de Continuidad de Actividades Escolares" },
      { code: "10.7.4", label: "Plan de Gestión del Patrimonio Cultural" },
    ],
  },
];

/** Tous les codes de requisitos AyS (ordre d'affichage) — seed + résolution. */
export const REQUISITOS_AYS_CODES: string[] = REQUISITOS_AYS.flatMap((g) =>
  g.requisitos.map((r) => r.code),
);

/** Référence MGAS affichable (« 10.5.1 » → « MGAS §10.5.1 »). */
export const refMgas = (code: string): string => `MGAS §${code}`;

// ============================================================
// Hojas de ruta — tâches de la feuille de route, par fase et composante.
// Source unique des libellés des tâches. Responsable par défaut = « ACEFE ».
// Les tâches `dinamica` adaptent leur contenu aux Requisitos AyS cochés du
// sous-projet (REQUISITOS_AYS / table ays_requisitos).
// ============================================================

export const RESPONSABLE_DEFECTO = "ACEFE";

export interface RoadmapTarea {
  // Clé de persistance stable (défaut = `nombre`). OBLIGATOIRE si deux tâches
  // partagent le même `nombre` (sinon collision de l'état en base).
  id?: string;
  fase: string; // code de fase (voir FASES)
  componente: ComponenteCode;
  nombre: string;
  responsable?: string; // défaut = RESPONSABLE_DEFECTO (ACEFE)
  comentario?: string; // commentaire par défaut de la carte (surchargé par l'édition admin)
  dinamica?: boolean; // contenu adapté aux Requisitos AyS cochés du sous-projet
}

// Tâches de la feuille de route, toutes composantes (AyS, Género, …). Identiques
// pour tous les sous-projets ; les tâches `dinamica` (AyS) se déclinent selon les
// requisitos cochés de chaque sous-projet.
export const ROADMAP_TAREAS: RoadmapTarea[] = [
  // --- Ambiental y social (AyS) ---
  { fase: "estudios_preliminares", componente: "AyS", nombre: "Elegibilidad y nivel de riesgo · Ficha de evaluación (Anexo 5)" },
  { fase: "anteproyecto", componente: "AyS", nombre: "Pre-categorización provincial digital" },
  { fase: "anteproyecto", componente: "AyS", nombre: "Memoria descriptiva / anteproyecto" },
  { fase: "anteproyecto", componente: "AyS", nombre: "Identificación de los otros planes de gestión relevantes para el proyecto" },
  { fase: "anteproyecto", componente: "AyS", nombre: "Plan de gestión del Patrimonio" },
  { fase: "proyecto_ejecutivo", componente: "AyS", nombre: "Categorización provincial" },
  { fase: "proyecto_ejecutivo", componente: "AyS", nombre: "Plan de continuidad de los servicios" },
  {
    fase: "proyecto_ejecutivo",
    componente: "AyS",
    nombre: "Lineamientos para otros planes necesarios según proyecto",
    dinamica: true,
  },
  {
    fase: "redaccion_pliegos",
    componente: "AyS",
    nombre: "Participación de experto AyS en la redacción del pliego",
  },
  {
    fase: "redaccion_pliegos",
    componente: "AyS",
    nombre: "Asegurar la integración de los lineamientos establecidos en la fase anterior",
  },
  { fase: "licitacion", componente: "AyS", nombre: "Verificación de las ofertas AyS según criterios AyS" },
  { fase: "licitacion", componente: "AyS", nombre: "Conformidad de los planes solicitados", dinamica: true },
  { fase: "obra", componente: "AyS", nombre: "Aprobación y seguimiento del PGASC" },
  { fase: "obra", componente: "AyS", nombre: "Conformidad del cronograma con el plan de continuidad" },
  { fase: "obra", componente: "AyS", nombre: "Coordinación y seguimiento de los planes solicitados" },
  { fase: "obra", componente: "AyS", nombre: "Gestión de reclamos" },

  // --- Género (G) — responsable por defecto ACEFE, salvo indicación (AT). ---
  { id: "genero-ep-diagnostico", fase: "estudios_preliminares", componente: "G", nombre: "Diagnóstico con perspectiva de género" },
  { id: "genero-ep-formacion", fase: "estudios_preliminares", componente: "G", nombre: "Formación a los equipos de la UG / Ministerio de línea sobre la incorporación de la perspectiva de género", responsable: "AT", comentario: "Impacto 4" },
  { id: "genero-antep-revision", fase: "anteproyecto", componente: "G", nombre: "Revisión de proyecto con perspectiva de género", responsable: "AT" },
  { id: "genero-antep-validacion", fase: "anteproyecto", componente: "G", nombre: "Validación de las medidas con mujeres beneficiarias", comentario: "Impacto 1" },
  { id: "genero-antep-secretaria", fase: "anteproyecto", componente: "G", nombre: "Participación de Secretaría de Mujeres, Género y Diversidad", comentario: "Impacto 3" },
  { id: "genero-pe-revision", fase: "proyecto_ejecutivo", componente: "G", nombre: "Revisión de proyecto con perspectiva de género", responsable: "AT" },
  { id: "genero-pliegos-lenguaje", fase: "redaccion_pliegos", componente: "G", nombre: "Revisión y corrección del lenguaje en documentos de licitación", responsable: "AT", comentario: "Impacto 5" },
  { id: "genero-pliegos-clausulas", fase: "redaccion_pliegos", componente: "G", nombre: "Incorporar cláusulas que valoren a oferentes con políticas de género", responsable: "AT", comentario: "Impacto 9.3" },
  { id: "genero-pliegos-inclusion", fase: "redaccion_pliegos", componente: "G", nombre: "Inclusión de políticas de igualdad y de género en los Pliegos de Condiciones de las licitaciones", responsable: "AT", comentario: "Impacto 9.4" },
  { id: "genero-pliegos-criterios", fase: "redaccion_pliegos", componente: "G", nombre: "Definición de criterios de evaluación específicos para valorar oferentes con políticas de género", comentario: "Impacto 9.5" },
  { id: "genero-pliegos-elm", fase: "redaccion_pliegos", componente: "G", nombre: "Revisión de documentos de licitación con respecto a Empresas Lideradas por Mujeres (ELM)", comentario: "Impacto 10" },
  { id: "genero-licitacion-evaluacion", fase: "licitacion", componente: "G", nombre: "Evaluación de ofertas con perspectiva de género", comentario: "Impacto 9 — relacionado con los criterios establecidos anteriormente" },

  // --- Eficiencia energética (EE) — responsable por defecto ACEFE, salvo (AT). ---
  { id: "ee-ep-auditoria", fase: "estudios_preliminares", componente: "EE", nombre: "Auditoría energética" },
  { id: "ee-ep-actualizacion-modelo", fase: "estudios_preliminares", componente: "EE", nombre: "Actualización del modelo de simulación", responsable: "AT" },
  { id: "ee-ep-aprobacion-criterio", fase: "estudios_preliminares", componente: "EE", nombre: "Aprobación del criterio PEEB Cool", responsable: "AT" },
  { id: "ee-antep-comprobacion", fase: "anteproyecto", componente: "EE", nombre: "Comprobación del indicador PEEB Cool", responsable: "AT" },
  { id: "ee-pe-comprobacion", fase: "proyecto_ejecutivo", componente: "EE", nombre: "Comprobación del indicador PEEB Cool", responsable: "AT" },
  { id: "ee-pe-especificaciones", fase: "proyecto_ejecutivo", componente: "EE", nombre: "Revisión de especificaciones técnicas de los materiales y equipos relativos a la EE", responsable: "AT" },
];

// Unités de « duración estimada » (planification des tâches/fases). Source unique
// des libellés (singulier/pluriel) pour le menu déroulant día / semana / mes.
export interface DuracionUnidad {
  code: string; // stocké en DB (dur_unidad)
  singular: string;
  plural: string;
}
export const DURACION_UNIDADES: DuracionUnidad[] = [
  { code: "dia", singular: "día", plural: "días" },
  { code: "semana", singular: "semana", plural: "semanas" },
  { code: "mes", singular: "mes", plural: "meses" },
];

// ============================================================
// Référentiels de gestion (CDC §3.2) — codes alignés sur les tables
// peebcoolsf_estados / _fases / _tipo_linea (seed). Source unique des
// libellés/couleurs côté UI (selects de « Gestión del subproyecto »).
// ============================================================

export interface EnumOption {
  code: string;
  nombre: string;
  color?: string; // badge (estados uniquement)
  onColor?: string;
}

// Estados (CDC §3.2 : « En proceso » jaune / « Terminado » vert clair) + vide autorisé.
export const ESTADOS: EnumOption[] = [
  { code: "en_proceso", nombre: "En proceso", color: "#ffd966", onColor: TEXTO_OSCURO },
  { code: "terminado", nombre: "Terminado", color: "#b6d7a8", onColor: TEXTO_OSCURO },
];

// Fases chronologiques (CDC §3.2) — sans couleur. Ordre = `orden` de peebcoolsf_fases.
export const FASES: EnumOption[] = [
  { code: "estudios_preliminares", nombre: "Estudios preliminares" },
  { code: "anteproyecto", nombre: "Anteproyecto" },
  { code: "proyecto_ejecutivo", nombre: "Proyecto ejecutivo" },
  { code: "redaccion_pliegos", nombre: "Redacción de pliegos" },
  { code: "no_objecion_afd", nombre: "No objeción AFD" },
  { code: "licitacion", nombre: "Licitación" },
  { code: "obra", nombre: "Obra" },
  { code: "general", nombre: "General" },
];

// ============================================================
// Tokens de surface (UI neutre). NE SONT PAS des couleurs de marque :
// implémentation du « fond gris clair » et de la sidebar #30323e (CDC §2.1).
// `focus` réutilise le bleu Escuelas (#3c78d8) de la palette — pas une couleur nouvelle.
// ============================================================
export const UI = {
  sidebarBg: "#30323e",
  sidebarText: "#e8e9ed",
  sidebarTextMuted: "#9aa1ad",
  sidebarActive: "rgba(255,255,255,0.10)",
  sidebarHover: "rgba(255,255,255,0.05)",
  sidebarBorder: "rgba(255,255,255,0.08)",
  appBg: "#f3f4f6",
  surface: "#ffffff",
  border: "#e4e6eb",
  text: TEXTO_OSCURO,
  textMuted: "#646b78",
  focus: "#3c78d8",
  // Accent de marque = rouge Assemblage (#E30513, charte graphique).
  // Distinct de la typologie H (#cc0000) pour éviter toute confusion.
  // Usage : indicateur de l'item de navigation actif (CDC §2.1 / charte §8).
  accent: "#E30513",
} as const;

// Variables CSS dérivées de UI — à poser en `style` sur <body> (source unique = ce fichier).
export const themeVars = {
  "--sidebar-bg": UI.sidebarBg,
  "--sidebar-text": UI.sidebarText,
  "--sidebar-text-muted": UI.sidebarTextMuted,
  "--sidebar-active": UI.sidebarActive,
  "--sidebar-hover": UI.sidebarHover,
  "--sidebar-border": UI.sidebarBorder,
  "--app-bg": UI.appBg,
  "--surface": UI.surface,
  "--border": UI.border,
  "--text": UI.text,
  "--text-muted": UI.textMuted,
  "--focus": UI.focus,
  "--accent": UI.accent,
} as CSSProperties;
