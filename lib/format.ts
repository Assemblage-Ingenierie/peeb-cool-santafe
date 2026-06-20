// ============================================================
// lib/format.ts — Formatage d'affichage (es-AR). Source unique du « — »
// pour les données manquantes (CDC : NULL → « — », jamais 0).
// ============================================================

/** Marqueur de donnée manquante (CDC). */
export const GUION = "—";

/**
 * Nombre formaté es-AR (séparateur de milliers).
 * `null`/`NaN` → « — ». `maxDecimals` optionnel (défaut : entier).
 */
export function fmtNumero(
  value: number | null | undefined,
  maxDecimals = 0,
): string {
  if (value == null || Number.isNaN(value)) return GUION;
  return new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: maxDecimals,
  }).format(value);
}

/**
 * Pourcentage formaté es-AR avec suffixe « % ».
 * `null`/`NaN` → « — ». `decimals` défaut : 1.
 */
export function fmtPct(value: number | null | undefined, decimals = 1): string {
  if (value == null || Number.isNaN(value)) return GUION;
  return `${new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)} %`;
}
