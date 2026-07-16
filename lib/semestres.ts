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

// Date locale → ISO (YYYY-MM-DD), sans décalage de fuseau.
const isoLocal = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
};

// Entrées de planning (date de début + durée estimée) d'une tâche de la feuille
// de route « Proyecto global ». SOURCE UNIQUE des règles de temporalité, utilisée
// à l'identique par les Hojas de ruta ET le Cronograma :
//   • informes GP/AyS : inicio 3 semanas antes del fin del semestre, duración 3 semanas ;
//   • otras tareas : duración 1 semana ; las del S2 empiezan 2 meses tras el inicio
//     del semestre, las del S1 al inicio.
// Un informe se reconnaît à sa clé `informe-…`.
export interface PlanGlobal {
  fechaInicio: string;
  durValor: number;
  durUnidad: "semana";
}
export function planTareaGlobal(semCode: string, tareaKey: string): PlanGlobal | null {
  const r = semestreRango(semCode);
  if (!r) return null;
  if (tareaKey.startsWith("informe-")) {
    const inicio = new Date(r.fin.getTime() - 21 * 86_400_000);
    return { fechaInicio: isoLocal(inicio), durValor: 3, durUnidad: "semana" };
  }
  const inicio = esS2(semCode)
    ? new Date(r.inicio.getFullYear(), r.inicio.getMonth() + 2, 1)
    : r.inicio;
  return { fechaInicio: isoLocal(inicio), durValor: 1, durUnidad: "semana" };
}

type UnidadDur = "dia" | "semana" | "mes";
const asUnidadDur = (u: string | null | undefined): UnidadDur | null =>
  u === "dia" || u === "semana" || u === "mes" ? u : null;

// Plan persisté d'une carte (peebcoolsf_roadmap_estado), champs pertinents.
export interface PlanStored {
  fechaInicio?: string | null;
  durValor?: number | null;
  durUnidad?: string | null;
  fechaFin?: string | null;
}

// Plan EFFECTIF d'une tâche globale : le plan STOCKÉ prime sur la règle (les
// règles ne sont que des défauts). La durée n'est surchargée que si valeur ET
// unité sont présentes (une valeur sans unité = incomplète → on garde la règle).
export function planGlobalEfectivo(
  semCode: string,
  tareaKey: string,
  stored: PlanStored | null | undefined,
): { fechaInicio: string | null; durValor: number | null; durUnidad: UnidadDur | null; fechaFin: string | null } {
  const regla = planTareaGlobal(semCode, tareaKey);
  const durU = asUnidadDur(stored?.durUnidad);
  const durOverride = stored?.durValor != null && durU != null;
  return {
    fechaInicio: stored?.fechaInicio ?? regla?.fechaInicio ?? null,
    durValor: durOverride ? stored!.durValor! : regla?.durValor ?? null,
    durUnidad: durOverride ? durU : regla?.durUnidad ?? null,
    fechaFin: stored?.fechaFin ?? null,
  };
}
