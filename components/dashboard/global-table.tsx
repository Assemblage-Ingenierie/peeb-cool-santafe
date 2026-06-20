"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { SnapshotSubproyecto, SnapshotMetrica, SnapshotFase } from "@/lib/snapshot";
import { FASES, ESTADOS, getTipologia, UI } from "@/lib/constants";
import { economiaKwh, economiaPct, porM2, suma } from "@/lib/calc";
import { fmtNumero, fmtPct } from "@/lib/format";
import { cn } from "@/lib/cn";

// ============================================================
// Tableau « Resumen » (mode Proyecto global) — 9 sous-projets × groupes de
// colonnes (CDC §4.1 / capture V2). Style sombre. 1er groupe = Progresión :
// une colonne par fase, case colorée selon l'estado → jauge de progression.
// Calculs dérivés (kWh/m², %, totaux) JAMAIS stockés : calculés ici.
// ============================================================

// Palette sombre (depuis les tokens UI — aucune couleur en dur).
const BG = UI.sidebarBg; // corps
const BG_HEAD = UI.text; // bandeau d'en-tête (plus foncé), opaque pour le sticky
const TXT = UI.sidebarText;
const TXT_MUTED = UI.sidebarTextMuted;
const BORDER = UI.sidebarBorder;
const COL_TERM = ESTADOS.find((e) => e.code === "terminado")?.color ?? "#b6d7a8";
const COL_PROC = ESTADOS.find((e) => e.code === "en_proceso")?.color ?? "#ffd966";

const FASE_ABBR: Record<string, string> = {
  estudios_preliminares: "Est. prel.",
  anteproyecto: "Antepr.",
  proyecto_ejecutivo: "Proy. ej.",
  redaccion_pliegos: "Pliegos",
  no_objecion_afd: "No obj.",
  licitacion: "Licit.",
  obra: "Obra",
  general: "Gral.",
};

const estadoLabel = (e: string | null) =>
  e === "terminado" ? "Terminado" : e === "en_proceso" ? "En proceso" : "Sin iniciar";

interface Fila {
  sub: SnapshotSubproyecto;
  met: SnapshotMetrica | undefined; // escenario faisabilidad (le seul rempli)
  estados: Record<string, string | null>; // fase code → estado
}

interface Columna {
  key: string;
  header: string;
  align: "left" | "right";
  minW?: string;
  display: (f: Fila) => ReactNode;
  csv: (f: Fila) => string;
}
interface Grupo {
  key: string;
  label: string;
  cols: Columna[];
}

const csvNum = (v: number | null) => (v == null || Number.isNaN(v) ? "" : String(v));
const numCol = (
  key: string,
  header: string,
  get: (f: Fila) => number | null,
  dec = 0,
): Columna => ({
  key,
  header,
  align: "right",
  display: (f) => fmtNumero(get(f), dec),
  csv: (f) => csvNum(get(f)),
});
const pctCol = (key: string, header: string, get: (f: Fila) => number | null): Columna => ({
  key,
  header,
  align: "right",
  display: (f) => fmtPct(get(f)),
  csv: (f) => csvNum(get(f)),
});
const txtCol = (
  key: string,
  header: string,
  get: (f: Fila) => string,
  minW?: string,
): Columna => ({ key, header, align: "left", minW, display: (f) => get(f), csv: (f) => get(f) });

const dem = (f: Fila) => f.met?.demanda_kwh ?? null;
const demDesp = (f: Fila) => f.met?.demanda_despues_kwh ?? null;

const GRUPOS: Grupo[] = [
  {
    key: "edificio",
    label: "Datos del edificio",
    cols: [
      txtCol("nombre", "Edificio", (f) => f.sub.nombre, "min-w-[200px]"),
      {
        key: "tipo",
        header: "Tipo",
        align: "left",
        display: (f) => <TipoBadge code={f.sub.tipologia} />,
        csv: (f) => getTipologia(f.sub.tipologia)?.nombre ?? f.sub.tipologia,
      },
      txtCol("direccion", "Dirección", (f) => f.sub.direccion ?? "—", "min-w-[180px]"),
      numCol("sup", "Superficie (m²)", (f) => f.sub.superficie_m2, 0),
    ],
  },
  {
    key: "consumos",
    label: "Consumos de energía (demanda teórica)",
    cols: [
      numCol("d_antes", "Antes (kWh)", dem),
      numCol("d_antes_m2", "Antes (kWh/m²)", (f) => porM2(dem(f), f.sub.superficie_m2), 1),
      numCol("d_desp", "Después (kWh)", demDesp),
      numCol("d_desp_m2", "Después (kWh/m²)", (f) => porM2(demDesp(f), f.sub.superficie_m2), 1),
      numCol("ahorro", "Ahorro (kWh)", (f) => economiaKwh(dem(f), demDesp(f))),
      numCol(
        "ahorro_m2",
        "Ahorro (kWh/m²)",
        (f) => porM2(economiaKwh(dem(f), demDesp(f)), f.sub.superficie_m2),
        1,
      ),
      pctCol("ahorro_pct", "Ahorro (%)", (f) => economiaPct(dem(f), demDesp(f))),
    ],
  },
  {
    key: "gei",
    label: "Emisiones de GEI",
    cols: [
      numCol("g_antes", "Antes (tCO₂)", (f) => f.met?.gei_antes_tco2 ?? null, 1),
      numCol("g_antes_m2", "Antes (tCO₂/m²)", (f) => porM2(f.met?.gei_antes_tco2 ?? null, f.sub.superficie_m2), 3),
      numCol("g_desp", "Después (tCO₂)", (f) => f.met?.gei_despues_tco2 ?? null, 1),
      numCol("g_desp_m2", "Después (tCO₂/m²)", (f) => porM2(f.met?.gei_despues_tco2 ?? null, f.sub.superficie_m2), 3),
      numCol("g_red", "Reducción (tCO₂)", (f) => economiaKwh(f.met?.gei_antes_tco2 ?? null, f.met?.gei_despues_tco2 ?? null), 1),
      pctCol("g_red_pct", "Reducción (%)", (f) => economiaPct(f.met?.gei_antes_tco2 ?? null, f.met?.gei_despues_tco2 ?? null)),
    ],
  },
  {
    key: "costos",
    label: "Costos de inversión",
    cols: [
      numCol("c_ee", "EE (€)", (f) => f.met?.costo_ee_eur ?? null),
      numCol("c_ee_m2", "EE (€/m²)", (f) => porM2(f.met?.costo_ee_eur ?? null, f.sub.superficie_m2), 0),
      numCol("c_ot", "Otras (€)", (f) => f.met?.costo_otras_eur ?? null),
      numCol("c_ot_m2", "Otras (€/m²)", (f) => porM2(f.met?.costo_otras_eur ?? null, f.sub.superficie_m2), 0),
      numCol("c_tot", "Total (€)", (f) => suma(f.met?.costo_ee_eur ?? null, f.met?.costo_otras_eur ?? null)),
      numCol("c_tot_m2", "Total (€/m²)", (f) => porM2(suma(f.met?.costo_ee_eur ?? null, f.met?.costo_otras_eur ?? null), f.sub.superficie_m2), 0),
    ],
  },
  {
    key: "beneficiarios",
    label: "Beneficiarios",
    cols: [
      numCol("b_pers", "Personal", (f) => f.met?.benef_personal ?? null),
      pctCol("b_pers_m", "% mujeres", (f) => f.met?.benef_personal_pct_muj ?? null),
      numCol("b_usu", "Usuarios", (f) => f.met?.benef_usuarios ?? null),
      pctCol("b_usu_m", "% mujeres", (f) => f.met?.benef_usuarios_pct_muj ?? null),
      numCol("b_ind", "Población cubierta", (f) => f.met?.benef_indirectos ?? null),
      pctCol("b_ind_m", "% mujeres", (f) => f.met?.benef_indirectos_pct_muj ?? null),
    ],
  },
];

const TODOS = [{ key: "progresion", label: "Progresión" }, ...GRUPOS.map((g) => ({ key: g.key, label: g.label }))];

function TipoBadge({ code }: { code: string }) {
  const tp = getTipologia(code);
  if (!tp) return <span>{code}</span>;
  return (
    <span
      className="inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-bold"
      style={{ backgroundColor: tp.color, color: tp.onColor }}
    >
      {tp.nombre}
    </span>
  );
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface GlobalTableProps {
  subproyectos: SnapshotSubproyecto[];
  metricas: SnapshotMetrica[];
  fases: SnapshotFase[];
}

export function GlobalTable({ subproyectos, metricas, fases }: GlobalTableProps) {
  const [visible, setVisible] = useState<Set<string>>(() => new Set(TODOS.map((g) => g.key)));

  const filas = useMemo<Fila[]>(() => {
    const metMap = new Map<string, SnapshotMetrica>();
    for (const m of metricas) if (m.escenario === "faisabilidad") metMap.set(m.subproyecto_uid, m);
    const faseMap = new Map<string, Record<string, string | null>>();
    for (const f of fases) {
      const r = faseMap.get(f.subproyecto_uid) ?? {};
      r[f.fase] = f.estado;
      faseMap.set(f.subproyecto_uid, r);
    }
    return subproyectos.map((sub) => ({
      sub,
      met: metMap.get(sub.uid),
      estados: faseMap.get(sub.uid) ?? {},
    }));
  }, [subproyectos, metricas, fases]);

  const gruposVis = GRUPOS.filter((g) => visible.has(g.key));
  const progVis = visible.has("progresion");

  const toggle = (key: string) =>
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const exportar = () => {
    const cols: { header: string; csv: (f: Fila) => string }[] = [];
    if (progVis)
      for (const fa of FASES)
        cols.push({ header: fa.nombre, csv: (f) => estadoLabel(f.estados[fa.code] ?? null) });
    for (const g of gruposVis)
      for (const c of g.cols) cols.push({ header: `${g.label} — ${c.header}`, csv: c.csv });
    const rows = [cols.map((c) => c.header), ...filas.map((f) => cols.map((c) => c.csv(f)))];
    downloadCsv("proyecto-global.csv", rows);
  };

  const thBase = "whitespace-nowrap border px-2 py-1.5 text-xs font-medium";

  return (
    <section className="flex flex-col gap-2">
      {/* Barre d'outils */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-[var(--text)]">Resumen del proyecto</h2>
        <div className="flex items-center gap-2">
          <details className="relative">
            <summary className="cursor-pointer list-none rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--text)]">
              Columnas ▾
            </summary>
            <div className="absolute right-0 z-20 mt-1 w-60 rounded-md border border-[var(--border)] bg-[var(--surface)] p-2 shadow-lg">
              {TODOS.map((g) => (
                <label
                  key={g.key}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-[var(--text)] hover:bg-[var(--app-bg)]"
                >
                  <input
                    type="checkbox"
                    checked={visible.has(g.key)}
                    onChange={() => toggle(g.key)}
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                  {g.label}
                </label>
              ))}
            </div>
          </details>
          <button
            type="button"
            onClick={exportar}
            className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--text)] hover:bg-[var(--app-bg)]"
          >
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Tableau (10 lignes ~ visibles, défilement + redimensionnable) */}
      <div
        className="resize-y overflow-auto rounded-lg"
        style={{ backgroundColor: BG, maxHeight: 420, minHeight: 160 }}
      >
        <table className="border-collapse text-xs" style={{ color: TXT }}>
          <thead className="sticky top-0 z-10">
            {/* Bandeau des groupes */}
            <tr>
              {progVis && (
                <th
                  colSpan={FASES.length}
                  className={cn(thBase, "text-center font-semibold")}
                  style={{ backgroundColor: BG_HEAD, color: TXT, borderColor: BORDER }}
                >
                  Progresión
                </th>
              )}
              {gruposVis.map((g) => (
                <th
                  key={g.key}
                  colSpan={g.cols.length}
                  className={cn(thBase, "text-center font-semibold")}
                  style={{ backgroundColor: BG_HEAD, color: TXT, borderColor: BORDER }}
                >
                  {g.label}
                </th>
              ))}
            </tr>
            {/* En-têtes de colonnes */}
            <tr>
              {progVis &&
                FASES.map((fa) => (
                  <th
                    key={fa.code}
                    title={fa.nombre}
                    className={cn(thBase, "min-w-[42px] text-center")}
                    style={{ backgroundColor: BG, color: TXT_MUTED, borderColor: BORDER }}
                  >
                    {FASE_ABBR[fa.code] ?? fa.nombre}
                  </th>
                ))}
              {gruposVis.flatMap((g) =>
                g.cols.map((c) => (
                  <th
                    key={c.key}
                    className={cn(thBase, c.minW, c.align === "right" ? "text-right" : "text-left")}
                    style={{ backgroundColor: BG, color: TXT_MUTED, borderColor: BORDER }}
                  >
                    {c.header}
                  </th>
                )),
              )}
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.sub.uid}>
                {progVis &&
                  FASES.map((fa) => {
                    const est = f.estados[fa.code] ?? null;
                    const bg =
                      est === "terminado" ? COL_TERM : est === "en_proceso" ? COL_PROC : "transparent";
                    return (
                      <td
                        key={fa.code}
                        title={`${fa.nombre}: ${estadoLabel(est)}`}
                        className="border"
                        style={{ backgroundColor: bg, borderColor: BORDER, minWidth: 42 }}
                      />
                    );
                  })}
                {gruposVis.flatMap((g) =>
                  g.cols.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        "whitespace-nowrap border px-2 py-1.5",
                        c.align === "right" ? "text-right" : "text-left",
                      )}
                      style={{ borderColor: BORDER }}
                    >
                      {c.display(f)}
                    </td>
                  )),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
