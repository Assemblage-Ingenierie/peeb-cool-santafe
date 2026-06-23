// ============================================================
// lib/format.ts — Formatage d'affichage (es-AR). Source unique du « — »
// pour les données manquantes (CDC : NULL → « — », jamais 0).
// ============================================================

/** Marqueur de donnée manquante (CDC). */
export const GUION = "—";

// Séparateur de milliers/millions : espace INSÉCABLE (U+00A0) → pas de coupure de
// ligne au milieu d'un nombre. Décimales conservées avec la virgule (es-AR).
// Choix utilisateur : milliers et millions espacés plutôt que séparés par un point.
// Défini via fromCharCode pour garder le source 100 % ASCII (zéro ambiguïté d'encodage).
const SEP_MILES = String.fromCharCode(0xa0);

/** Formate en es-AR puis remplace le séparateur de groupe (« . ») par une espace insécable. */
function formatEspaciado(value: number, opts: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat("es-AR", opts)
    .formatToParts(value)
    .map((p) => (p.type === "group" ? SEP_MILES : p.value))
    .join("");
}

/**
 * Nombre formaté : milliers espacés, décimales avec la virgule.
 * `null`/`NaN` → « — ». `maxDecimals` optionnel (défaut : entier).
 */
export function fmtNumero(
  value: number | null | undefined,
  maxDecimals = 0,
): string {
  if (value == null || Number.isNaN(value)) return GUION;
  return formatEspaciado(value, { maximumFractionDigits: maxDecimals });
}

/**
 * Pourcentage formaté (milliers espacés) avec suffixe « % ».
 * `null`/`NaN` → « — ». `decimals` défaut : 1.
 */
export function fmtPct(value: number | null | undefined, decimals = 1): string {
  if (value == null || Number.isNaN(value)) return GUION;
  return `${formatEspaciado(value, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} %`;
}
