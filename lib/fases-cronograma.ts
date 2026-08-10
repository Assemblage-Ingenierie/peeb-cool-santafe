// ============================================================
// lib/fases-cronograma.ts — Couleurs et sigles des FASES du cronograma.
// Source UNIQUE (auparavant codée en dur dans cronograma-client.tsx) : partagée
// par le Cronograma ET le tracker « Fases en curso » de l'Inicio, pour que les
// deux vues ne puissent pas diverger.
//
// ⚠ Ces couleurs ne sont PAS dans la charte de lib/constants.ts : elles sont
// reprises du cronograma de référence (« PEEB Santa Fe - AT Etapa 1 ») pour que
// l'app et l'Excel se lisent avec le même code couleur. Ne pas les mélanger avec
// la charte des composantes/typologies.
// ============================================================

import { GESTION_FASES, ROJO_AFD } from "./constants";

// Phases affichées (ordre chronologique canonique, hors « general »).
export const FASES_ORD = GESTION_FASES.filter((f) => f.code !== "general");

// Bleus progressifs pour les barres de phase (clair → foncé).
const BLUES = ["#cfe2f3", "#9fc5e8", "#6fa8dc", "#3d85c6", "#0b5394", "#073763"];
// Rouge des fases « No objeción AFD » : source unique dans lib/constants (charte).

// Couleurs spécifiques par fase (priment sur le dégradé de bleus).
export const FASE_COLOR: Record<string, string> = {
  // Jaune de la FAMILLE EE mais À PEINE plus soutenu que les tâches EE
  // (#fff2cc) : les études préliminaires SONT des études d'EE (choix client,
  // août 2026), tout en restant distinguables des barres EE dans la phase.
  estudios_preliminares: "#ffecb3",
  redaccion_pliegos: "#ea9999", // même rouge clair que licitación
  licitacion: "#ea9999",
  obra: "#fce5cd", // orange clair de l'Excel (Obras)
};

// Sigles des fases sur les frises. Règle : toutes les « No objeción AFD » → « CNO ».
export const FASE_SIGLA: Record<string, string> = {
  estudios_preliminares: "EP",
  anteproyecto: "AP",
  proyecto_ejecutivo: "PE",
  redaccion_pliegos: "PL",
  no_objecion_afd: "CNO",
  licitacion: "LI",
  no_objecion_afd_atribucion: "CNO",
  no_objecion_afd_contrato: "CNO",
  obra: "OB",
};

// Fases affichées dans les légendes (ordre chronologique), hors jalons AFD dupliqués.
export const LEYENDA_FASES = [
  "estudios_preliminares",
  "anteproyecto",
  "proyecto_ejecutivo",
  "redaccion_pliegos",
  "no_objecion_afd",
  "licitacion",
  "obra",
];

// Couleur de texte lisible sur un fond donné (luminance perçue).
export function textoSobre(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#1f2733" : "#ffffff";
}

// Couleur d'une fase (bande de temps) : bleu progressif par ordre, ROUGE pour
// « No objeción AFD » et ses jalons.
export const colorFase = (code: string, i: number): string =>
  FASE_COLOR[code] ?? (code.includes("no_objecion_afd") ? ROJO_AFD : BLUES[i % BLUES.length]);

// Couleur d'une fase par son code (index dans l'ordre canonique).
export const colorDeFase = (code: string): string =>
  colorFase(code, FASES_ORD.findIndex((f) => f.code === code));
