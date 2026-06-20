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
