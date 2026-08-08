// ============================================================
// lib/pag.ts — Plan de Acción de Género (PAG) : catalogue des acciones.
//
// SOURCE UNIQUE de la feuille « Implementación del PAG », partagée par le
// Cronograma et les Hojas de ruta (les deux vues ne peuvent pas diverger).
//
// Périmètre : sur les 49 acciones du fichier « Hoja de ruta PAG detallada »,
// seules les 33 qui se traitent UNE SEULE FOIS au niveau du programme sont ici.
// Les 16 autres sont répliquées bâtiment par bâtiment et restent dans la feuille
// de chaque sous-projet (composante Género, ROADMAP_TAREAS).
//   • ambito "gob"      (18) : une occurrence, au niveau gouvernance ;
//   • ambito "una-vez"  (15) : destinée aux sous-projets mais produite une fois
//     (`aplicaFase` nomme la phase où le livrable sera utilisé — c'est un RENVOI,
//     pas une réplication : aucune barre ×27 n'est dessinée dans ces vues).
//
// Les dates sont des ENTRÉES (ancres), pas des résultats : elles alimentent
// computeSchedule comme n'importe quelle carte. Elles ont été déduites des
// semestres de la colonne D, des durées de la colonne L et des enchaînements des
// colonnes M/N du fichier — la colonne « Fecha en la que podría iniciarse » est
// vide sur 45 lignes sur 49. Elles sont éditables depuis le mode Admin de la
// feuille (elles ne sont PAS branchées dans la section /admin).
// ============================================================

import { CARD_TONOS } from "./constants";
import type { Unidad } from "./schedule";

/** Clé de la feuille du plan d'action genre (peebcoolsf_roadmap_estado.feuille). */
export const FEUILLE_PAG = "pag";

/** Clé de tâche persistée pour une acción (`pag-9.3.1`). */
export const pagTareaKey = (code: string): string => `pag-${code}`;

export type PagResponsable = "ACEFE" | "UG" | "AT";
export type PagEje = "inst" | "cap" | "com" | "prev" | "compras" | "mon";

export interface PagAccion {
  code: string; // « 9.3.1 » — numérotation du fichier PAG
  titulo: string;
  impacto: number; // 1 → 11
  eje: PagEje;
  cadena: string; // C1 … C7
  ambito: "gob" | "una-vez";
  responsable: PagResponsable;
  apoyoAT: boolean; // colonne « Necesita apoyo de la asistencia técnica » = SÍ
  durValor: number;
  durUnidad: Unidad;
  inicio: string; // ancre ISO (YYYY-MM-DD)
  /** Fin manuelle : au-delà de la durée estimée, l'excédent est rendu en hachures. */
  fin?: string;
  /** Phase du sous-projet où le livrable sera appliqué (renvoi, pas réplication). */
  aplicaFase?: string;
  /** Acción sans terme (mécanisme, suivi, contingente). */
  continua?: boolean;
  continuaTxt?: string;
}

// Fin de la fenêtre du projet (dernière obra livrée) — borne des acciones continues.
const FIN_PROYECTO = "2030-10-22";

export const PAG_ACCIONES: PagAccion[] = [
  // --- C1 · Gobernanza institucional (Impactos 1 · 3) ---
  { code: "3.3.1", titulo: "Invitar formalmente a la Secretaría de Mujeres a la gobernanza", impacto: 3, eje: "inst", cadena: "C1", ambito: "gob", responsable: "ACEFE", apoyoAT: true, durValor: 3, durUnidad: "semana", inicio: "2026-09-01" },
  { code: "3.1.1", titulo: "Crear el comité de género en la Unidad de Gestión", impacto: 3, eje: "inst", cadena: "C1", ambito: "gob", responsable: "UG", apoyoAT: true, durValor: 2, durUnidad: "semana", inicio: "2026-09-22" },
  { code: "3.2.1", titulo: "Área transversal de coordinación de género en la UG", impacto: 3, eje: "inst", cadena: "C1", ambito: "gob", responsable: "UG", apoyoAT: true, durValor: 3, durUnidad: "semana", inicio: "2026-10-06" },
  { code: "3.5.1", titulo: "Lecciones aprendidas de proyectos anteriores de ACEFE", impacto: 3, eje: "inst", cadena: "C1", ambito: "gob", responsable: "AT", apoyoAT: true, durValor: 12, durUnidad: "semana", inicio: "2026-09-01" },
  { code: "3.4.1", titulo: "Política institucional escrita de igualdad de género", impacto: 3, eje: "inst", cadena: "C1", ambito: "gob", responsable: "ACEFE", apoyoAT: true, durValor: 12, durUnidad: "semana", inicio: "2027-03-01" },
  { code: "1.1.1", titulo: "Criterios de paridad en el Manual de Procedimientos", impacto: 1, eje: "inst", cadena: "C1", ambito: "gob", responsable: "UG", apoyoAT: false, durValor: 2, durUnidad: "semana", inicio: "2026-09-01" },

  // --- C2 · Formación del equipo del proyecto (Impactos 4 · 5) ---
  { code: "4.1.1", titulo: "Definir metodología y contenidos de la formación", impacto: 4, eje: "cap", cadena: "C2", ambito: "gob", responsable: "AT", apoyoAT: true, durValor: 3, durUnidad: "semana", inicio: "2026-10-01" },
  { code: "4.1.2", titulo: "Planificar las primeras formaciones", impacto: 4, eje: "cap", cadena: "C2", ambito: "gob", responsable: "AT", apoyoAT: true, durValor: 2, durUnidad: "semana", inicio: "2026-10-22" },
  { code: "4.1.3", titulo: "Convocar al personal", impacto: 4, eje: "cap", cadena: "C2", ambito: "gob", responsable: "UG", apoyoAT: false, durValor: 2, durUnidad: "semana", inicio: "2026-11-05" },
  { code: "4.1.4", titulo: "Dictar los talleres", impacto: 4, eje: "cap", cadena: "C2", ambito: "gob", responsable: "AT", apoyoAT: true, durValor: 4, durUnidad: "semana", inicio: "2026-11-19" },
  { code: "4.1.5", titulo: "Instancia de feedback de los participantes", impacto: 4, eje: "cap", cadena: "C2", ambito: "gob", responsable: "AT", apoyoAT: true, durValor: 2, durUnidad: "semana", inicio: "2027-02-02" },
  { code: "5.1.1", titulo: "Formar al personal en comunicación con perspectiva de género", impacto: 5, eje: "cap", cadena: "C2", ambito: "gob", responsable: "AT", apoyoAT: true, durValor: 3, durUnidad: "semana", inicio: "2026-11-19" },

  // --- C3 · Comunicación inclusiva (Impacto 5) ---
  { code: "5.1.2", titulo: "Revisar o elaborar la guía de comunicación inclusiva", impacto: 5, eje: "com", cadena: "C3", ambito: "gob", responsable: "UG", apoyoAT: true, durValor: 3, durUnidad: "semana", inicio: "2026-10-01" },
  { code: "5.2.1", titulo: "Revisión inicial de los materiales de comunicación", impacto: 5, eje: "com", cadena: "C3", ambito: "gob", responsable: "AT", apoyoAT: true, durValor: 3, durUnidad: "semana", inicio: "2027-02-02" },
  { code: "5.3.1", titulo: "Canales de difusión accesibles e inclusivos", impacto: 5, eje: "com", cadena: "C3", ambito: "una-vez", responsable: "UG", apoyoAT: true, durValor: 3, durUnidad: "semana", inicio: "2027-03-01", aplicaFase: "estudios_preliminares" },

  // --- C4 · Compras públicas inclusivas y ELM (Impactos 9 · 10) ---
  { code: "10.2.1", titulo: "Analizar la experiencia del sello EPM", impacto: 10, eje: "compras", cadena: "C4", ambito: "gob", responsable: "ACEFE", apoyoAT: true, durValor: 3, durUnidad: "semana", inicio: "2026-09-01" },
  { code: "10.1.1", titulo: "Diagnóstico de barreras de las Empresas Lideradas por Mujeres", impacto: 10, eje: "compras", cadena: "C4", ambito: "gob", responsable: "ACEFE", apoyoAT: true, durValor: 3, durUnidad: "semana", inicio: "2026-09-22" },
  { code: "9.2.1", titulo: "Medidas de acción positiva para los pliegos de condiciones", impacto: 9, eje: "compras", cadena: "C4", ambito: "una-vez", responsable: "ACEFE", apoyoAT: true, durValor: 4, durUnidad: "semana", inicio: "2026-10-13", aplicaFase: "anteproyecto" },
  { code: "9.3.1", titulo: "Criterios de evaluación con puntaje de género", impacto: 9, eje: "compras", cadena: "C4", ambito: "una-vez", responsable: "ACEFE", apoyoAT: true, durValor: 4, durUnidad: "semana", inicio: "2026-11-10", aplicaFase: "redaccion_pliegos" },
  { code: "9.4.1", titulo: "Medidas ante incumplimiento de las empresas adjudicadas", impacto: 9, eje: "compras", cadena: "C4", ambito: "una-vez", responsable: "ACEFE", apoyoAT: true, durValor: 4, durUnidad: "semana", inicio: "2026-11-10", aplicaFase: "redaccion_pliegos" },
  { code: "10.4.1", titulo: "Condiciones contractuales favorables a las ELM", impacto: 10, eje: "compras", cadena: "C4", ambito: "una-vez", responsable: "ACEFE", apoyoAT: true, durValor: 4, durUnidad: "semana", inicio: "2026-11-10", aplicaFase: "redaccion_pliegos" },

  // --- C5 · Empleabilidad de mujeres (Impacto 9.1) ---
  { code: "9.1.2", titulo: "Identificar con las cámaras las capacidades a fortalecer", impacto: 9, eje: "compras", cadena: "C5", ambito: "una-vez", responsable: "ACEFE", apoyoAT: true, durValor: 3, durUnidad: "semana", inicio: "2027-03-01", aplicaFase: "anteproyecto" },
  { code: "9.1.1", titulo: "Sesiones con cámaras y sindicatos sobre empleabilidad de mujeres", impacto: 9, eje: "compras", cadena: "C5", ambito: "una-vez", responsable: "ACEFE", apoyoAT: true, durValor: 8, durUnidad: "semana", inicio: "2027-04-05", aplicaFase: "proyecto_ejecutivo" },
  { code: "9.1.3", titulo: "Capacitación técnica dirigida a mujeres", impacto: 9, eje: "compras", cadena: "C5", ambito: "una-vez", responsable: "ACEFE", apoyoAT: true, durValor: 8, durUnidad: "semana", inicio: "2027-08-02", aplicaFase: "licitacion" },
  { code: "9.5.1", titulo: "Adhesión de contratistas a compromisos de igualdad", impacto: 9, eje: "compras", cadena: "C5", ambito: "una-vez", responsable: "ACEFE", apoyoAT: true, durValor: 8, durUnidad: "semana", inicio: "2027-08-02", aplicaFase: "licitacion" },

  // --- C6 · Prevención de violencia y reclamos (Impacto 8) ---
  { code: "8.3.1", titulo: "Código de ética y protocolo de actuación integral", impacto: 8, eje: "prev", cadena: "C6", ambito: "gob", responsable: "UG", apoyoAT: true, durValor: 8, durUnidad: "semana", inicio: "2027-02-01" },
  { code: "8.1.1", titulo: "Sesiones obligatorias de sensibilización (Ley Micaela)", impacto: 8, eje: "prev", cadena: "C6", ambito: "gob", responsable: "UG", apoyoAT: true, durValor: 4, durUnidad: "semana", inicio: "2027-04-05" },
  { code: "8.4.1", titulo: "Mecanismo de consultas y reclamos con enfoque de género", impacto: 8, eje: "prev", cadena: "C6", ambito: "una-vez", responsable: "UG", apoyoAT: true, durValor: 4, durUnidad: "semana", inicio: "2027-04-05", fin: FIN_PROYECTO, aplicaFase: "todas", continua: true, continuaTxt: "permanente" },
  { code: "8.2.1", titulo: "Capacitaciones específicas ante casos de violencia o acoso", impacto: 8, eje: "prev", cadena: "C6", ambito: "una-vez", responsable: "UG", apoyoAT: true, durValor: 4, durUnidad: "semana", inicio: "2027-03-29", fin: FIN_PROYECTO, aplicaFase: "todas", continua: true, continuaTxt: "a demanda" },

  // --- C7 · Monitoreo con enfoque de género (Impacto 11) ---
  { code: "11.1.1", titulo: "Diseñar el sistema de monitoreo con indicadores de género", impacto: 11, eje: "mon", cadena: "C7", ambito: "una-vez", responsable: "ACEFE", apoyoAT: true, durValor: 4, durUnidad: "semana", inicio: "2026-10-01", aplicaFase: "estudios_preliminares" },
  { code: "11.1.2", titulo: "Asegurar el seguimiento de los indicadores de género", impacto: 11, eje: "mon", cadena: "C7", ambito: "una-vez", responsable: "ACEFE", apoyoAT: true, durValor: 4, durUnidad: "semana", inicio: "2026-11-01", fin: FIN_PROYECTO, aplicaFase: "todas", continua: true, continuaTxt: "continuo" },
  { code: "11.1.3", titulo: "Cláusulas de reporte desagregado en los contratos", impacto: 11, eje: "mon", cadena: "C7", ambito: "una-vez", responsable: "ACEFE", apoyoAT: false, durValor: 4, durUnidad: "semana", inicio: "2026-11-10", aplicaFase: "redaccion_pliegos" },
  { code: "11.1.4", titulo: "Monitoreo y análisis durante el uso y la operación", impacto: 11, eje: "mon", cadena: "C7", ambito: "una-vez", responsable: "ACEFE", apoyoAT: true, durValor: 8, durUnidad: "semana", inicio: "2028-09-01", fin: FIN_PROYECTO, aplicaFase: "obra", continua: true, continuaTxt: "tras cada obra" },
];

export const getPagAccion = (code: string): PagAccion | undefined =>
  PAG_ACCIONES.find((a) => a.code === code);

// ------------------------------------------------------------
// Chaînes de dépendances — l'ossature de la feuille. Elles viennent des colonnes
// « Necesidad de finalizar / empezar antes de » et « Se vincula con acción ».
// `flojo` = lien d'apport (pas un prérequis strict) → flèche atténuée.
// ------------------------------------------------------------
export interface PagCadena {
  code: string;
  nombre: string;
  impactos: string;
  orden: string[]; // codes d'acción, dans l'ordre de la chaîne
  flojo?: string[]; // codes dont la flèche entrante est un simple apport
}

export const PAG_CADENAS: PagCadena[] = [
  { code: "C1", nombre: "Gobernanza institucional", impactos: "Impactos 1 · 3", orden: ["3.3.1", "3.1.1", "3.2.1", "3.5.1", "3.4.1", "1.1.1"], flojo: ["3.5.1", "1.1.1"] },
  { code: "C2", nombre: "Formación del equipo del proyecto", impactos: "Impactos 4 · 5", orden: ["4.1.1", "4.1.2", "4.1.3", "4.1.4", "4.1.5", "5.1.1"], flojo: ["5.1.1"] },
  { code: "C3", nombre: "Comunicación inclusiva", impactos: "Impacto 5", orden: ["5.1.2", "5.2.1", "5.3.1"], flojo: ["5.3.1"] },
  { code: "C4", nombre: "Compras públicas inclusivas y ELM", impactos: "Impactos 9 · 10", orden: ["10.2.1", "10.1.1", "9.2.1", "9.3.1", "9.4.1", "10.4.1"], flojo: ["9.4.1", "10.4.1"] },
  { code: "C5", nombre: "Empleabilidad de mujeres", impactos: "Impacto 9.1", orden: ["9.1.2", "9.1.1", "9.1.3", "9.5.1"], flojo: ["9.5.1"] },
  { code: "C6", nombre: "Prevención de violencia y reclamos", impactos: "Impacto 8", orden: ["8.3.1", "8.1.1", "8.4.1", "8.2.1"], flojo: ["8.4.1", "8.2.1"] },
  { code: "C7", nombre: "Monitoreo con enfoque de género", impactos: "Impacto 11", orden: ["11.1.1", "11.1.2", "11.1.3", "11.1.4"], flojo: ["11.1.3"] },
];

// ------------------------------------------------------------
// Ejes — regroupement des impactos qui se lisent ensemble (vue « Proyecto global »).
// Les impactos 2, 6 et 7 n'y figurent pas : toutes leurs acciones sont répliquées
// par bâtiment, donc hors périmètre de cette feuille.
// ------------------------------------------------------------
export const PAG_EJES: { code: PagEje; nombre: string; impactos: string }[] = [
  { code: "inst", nombre: "Estructura institucional y decisión", impactos: "1 · 3" },
  { code: "cap", nombre: "Capacitación del equipo del proyecto", impactos: "4 · 5" },
  { code: "com", nombre: "Comunicación inclusiva", impactos: "5" },
  { code: "prev", nombre: "Prevención de violencia y reclamos", impactos: "8" },
  { code: "compras", nombre: "Compras públicas inclusivas y empleabilidad", impactos: "9 · 10" },
  { code: "mon", nombre: "Monitoreo con enfoque de género", impactos: "11" },
];

/** Jalons du PAG — les engagements datés du plan (frise de la vue globale). */
export const PAG_HITOS: { fecha: string; nombre: string }[] = [
  { fecha: "2026-10-06", nombre: "Comité de género creado" },
  { fecha: "2026-10-22", nombre: "Guía de comunicación aprobada" },
  { fecha: "2026-10-29", nombre: "Sistema de monitoreo operativo" },
  { fecha: "2026-12-08", nombre: "Cláusulas de género listas para pliegos" },
  { fecha: "2026-12-17", nombre: "Primeros talleres dictados" },
  { fecha: "2027-03-29", nombre: "Código de ética validado" },
  { fecha: "2027-04-05", nombre: "Mecanismo de reclamos habilitado" },
  { fecha: "2027-05-24", nombre: "Política institucional aprobada" },
];

// ------------------------------------------------------------
// Remplissage des barres par responsable — une échelle à trois degrés dans la
// seule famille de la composante Género (CARD_TONOS.G) : aucune teinte inventée.
//   ACEFE → aplat violet foncé      UG → aplat violet clair, sans contour
//   AT    → fond blanc, contour violet
// Pas de hachures : elles gardent leur sens actuel dans l'app (excédent au-delà
// de la durée estimée, CapaBarras).
// ------------------------------------------------------------
export const PAG_RESPONSABLES: PagResponsable[] = ["ACEFE", "UG", "AT"];

export const PAG_RESP_NOMBRE: Record<PagResponsable, string> = {
  ACEFE: "ACEFE",
  UG: "UG",
  AT: "AT — Asistencia Técnica",
};

export interface PagRelleno {
  color: string;
  texto: string;
  borde?: string;
  patron?: string; // background-image (prime sur `color`)
}

export const PAG_RELLENO: Record<PagResponsable, PagRelleno> = {
  ACEFE: { color: CARD_TONOS.G.foot, texto: "#ffffff" },
  UG: { color: CARD_TONOS.G.head, texto: CARD_TONOS.G.headText },
  AT: { color: "#ffffff", texto: CARD_TONOS.G.headText, borde: CARD_TONOS.G.foot },
};

/** Libellé court de la phase d'application (renvoi vers les sous-projets). */
export const PAG_FASE_NOMBRE: Record<string, string> = {
  estudios_preliminares: "Estudios preliminares",
  anteproyecto: "Anteproyecto",
  proyecto_ejecutivo: "Proyecto ejecutivo",
  redaccion_pliegos: "Redacción de pliegos",
  licitacion: "Licitación",
  obra: "Obras",
  todas: "todas las fases",
};
