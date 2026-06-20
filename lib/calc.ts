// ============================================================
// lib/calc.ts — Calculs dérivés (CDC §4.2). JAMAIS stockés en base :
// calculés à l'affichage depuis demanda_kwh / demanda_despues_kwh / superficie_m2.
// Toute donnée manquante → null (affiché « — », jamais 0).
// ============================================================

/** Économie d'énergie absolue (kWh) : avant − après. null si une valeur manque. */
export function economiaKwh(
  antes: number | null,
  despues: number | null,
): number | null {
  if (antes == null || despues == null) return null;
  return antes - despues;
}

/**
 * Économie d'énergie relative (%) : (avant − après) / avant × 100.
 * null si une valeur manque ou si `antes` vaut 0 (division impossible).
 */
export function economiaPct(
  antes: number | null,
  despues: number | null,
): number | null {
  if (antes == null || despues == null || antes === 0) return null;
  return ((antes - despues) / antes) * 100;
}

/** Intensité énergétique (kWh/m²) : kwh / superficie. null si valeur manque ou m² = 0. */
export function kwhPorM2(kwh: number | null, m2: number | null): number | null {
  if (kwh == null || m2 == null || m2 === 0) return null;
  return kwh / m2;
}
