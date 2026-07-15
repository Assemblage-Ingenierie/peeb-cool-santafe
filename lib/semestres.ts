// ============================================================
// lib/semestres.ts — Semestres du calendrier « Proyecto global » (S2 2026 →
// S2 2030) + utilitaires de dates. Source UNIQUE partagée par la feuille de
// route (Hojas de ruta) et le Cronograma.
// ============================================================

export interface Semestre {
  code: string; // `s1-2027`, `s2-2026`…
  label: string; // `S1 2027`, `S2 2026`…
}

// Démarre à S2 2026 (le S1 2026 est antérieur au projet).
export const SEMESTRES: Semestre[] = (() => {
  const out: Semestre[] = [];
  for (let anio = 2026; anio <= 2030; anio += 1) {
    for (const s of [1, 2] as const) {
      if (anio === 2026 && s === 1) continue;
      out.push({ code: `s${s}-${anio}`, label: `S${s} ${anio}` });
    }
  }
  return out;
})();

export const SEMESTRES_CODES = SEMESTRES.map((s) => s.code);

export const labelSemestre = (code: string): string =>
  SEMESTRES.find((s) => s.code === code)?.label ?? code;

export const esS2 = (code: string): boolean => code.startsWith("s2-");

/**
 * Bornes d'un semestre (dates locales). S1 = 1 ene → 30 jun ; S2 = 1 jul → 31 dic.
 * Renvoie null si le code n'est pas un semestre valide.
 */
export function semestreRango(code: string): { inicio: Date; fin: Date } | null {
  const m = /^s([12])-(\d{4})$/.exec(code);
  if (!m) return null;
  const s = Number(m[1]);
  const y = Number(m[2]);
  return s === 1
    ? { inicio: new Date(y, 0, 1), fin: new Date(y, 5, 30) }
    : { inicio: new Date(y, 6, 1), fin: new Date(y, 11, 31) };
}
