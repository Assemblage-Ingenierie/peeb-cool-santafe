"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { SnapshotSubproyecto, SnapshotMetrica, SnapshotFase } from "@/lib/snapshot";
import { FASES, ESTADOS, getTipologia, UI } from "@/lib/constants";
import { economiaKwh, economiaPct, porM2, suma } from "@/lib/calc";
import { fmtNumero, fmtPct } from "@/lib/format";
import { cn } from "@/lib/cn";

// ============================================================
// Tableau « Resumen » (mode Proyecto global) — 9 sous-projets × groupes de
// colonnes (CDC §4.1 / capture V2). En-têtes SOMBRES, lignes de données BLANCHES.
// Ordre : Datos del edificio (toujours 1er, non masquable) → Progresión (jauge
// des fases, colonnes étroites + titres verticaux) → Consumos → GEI → Costos →
// Beneficiarios. Calculs dérivés JAMAIS stockés : calculés ici.
// ============================================================

// En-têtes : palette sombre (tokens UI). Corps : surfaces claires (var CSS).
const HEAD_GROUP_BG = UI.text; // bandeau de groupes (plus foncé), opaque pour le sticky
const HEAD_COL_BG = UI.sidebarBg; // ligne des titres de colonnes
const HEAD_TXT = UI.sidebarText;
const HEAD_TXT_MUTED = UI.sidebarTextMuted;
const HEAD_BORDER = UI.sidebarBorder;
const COL_TERM = ESTADOS.find((e) => e.code === "terminado")?.color ?? "#b6d7a8";
const COL_PROC = ESTADOS.find((e) => e.code === "en_proceso")?.color ?? "#ffd966";

const PROG_W = 14; // largeur des colonnes Progresión (~1/3 d'une colonne normale)
const PROG_FASES = FASES.filter((f) => f.code !== "general"); // « General » exclu de la jauge

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
const numCol = (key: string, header: string, get: (f: Fila) => number | null, dec = 0): Columna => ({
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
const txtCol = (key: string, header: string, get: (f: Fila) => string, minW?: string): Columna => ({
  key,
  header,
  align: "left",
  minW,
  display: (f) => get(f),
  csv: (f) => get(f),
});

const dem = (f: Fila) => f.met?.demanda_kwh ?? null;
const demDesp = (f: Fila) => f.met?.demanda_despues_kwh ?? null;

// Toujours en 1er, non masquable, sans adresse.
const EDIFICIO: Grupo = {
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
    numCol("sup", "Superficie (m²)", (f) => f.sub.superficie_m2, 0),
  ],
};

const DATA_GROUPS: Grupo[] = [
  {
    key: "consumos",
    label: "Consumos de energía (demanda teórica)",
    cols: [
      numCol("d_antes", "Antes (kWh)", dem),
      numCol("d_antes_m2", "Antes (kWh/m²)", (f) => porM2(dem(f), f.sub.superficie_m2), 1),
      numCol("d_desp", "Después (kWh)", demDesp),
      numCol("d_desp_m2", "Después (kWh/m²)", (f) => porM2(demDesp(f), f.sub.superficie_m2), 1),
      numCol("ahorro", "Ahorro (kWh)", (f) => economiaKwh(dem(f), demDesp(f))),
      numCol("ahorro_m2", "Ahorro (kWh/m²)", (f) => porM2(economiaKwh(dem(f), demDesp(f)), f.sub.superficie_m2), 1),
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

// Masquables (Datos del edificio est toujours affiché) : Progresión + groupes de données.
const TOGGLEABLE = [
  { key: "progresion", label: "Progresión" },
  ...DATA_GROUPS.map((g) => ({ key: g.key, label: g.label })),
];

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
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
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
  const [visible, setVisible] = useState<Set<string>>(() => new Set(TOGGLEABLE.map((g) => g.key)));

  const filas = useMemo<Fila[]>(() => {
    const metMap = new Map<string, SnapshotMetrica>();
    for (const m of metricas) if (m.escenario === "faisabilidad") metMap.set(m.subproyecto_uid, m);
    const faseMap = new Map<string, Record<string, string | null>>();
    for (const f of fases) {
      const r = faseMap.get(f.subproyecto_uid) ?? {};
      r[f.fase] = f.estado;
      faseMap.set(f.subproyecto_uid, r);
    }
    return subproyectos.map((sub) => ({ sub, met: metMap.get(sub.uid), estados: faseMap.get(sub.uid) ?? {} }));
  }, [subproyectos, metricas, fases]);

  const progVis = visible.has("progresion");
  const dataVis = DATA_GROUPS.filter((g) => visible.has(g.key));

  const toggle = (key: string) =>
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const exportar = () => {
    const cols: { header: string; csv: (f: Fila) => string }[] = [];
    for (const c of EDIFICIO.cols) cols.push({ header: `${EDIFICIO.label} — ${c.header}`, csv: c.csv });
    if (progVis) for (const fa of PROG_FASES) cols.push({ header: fa.nombre, csv: (f) => estadoLabel(f.estados[fa.code] ?? null) });
    for (const g of dataVis) for (const c of g.cols) cols.push({ header: `${g.label} — ${c.header}`, csv: c.csv });
    const rows = [cols.map((c) => c.header), ...filas.map((f) => cols.map((c) => c.csv(f)))];
    downloadCsv("proyecto-global.csv", rows);
  };

  // Styles d'en-tête (sombres) et de corps (clairs).
  const groupTh = "whitespace-nowrap border px-2 py-1.5 text-center text-xs font-semibold";
  const colTh = "border px-2 py-1.5 text-xs font-medium align-bottom";
  const headGroupStyle = { backgroundColor: HEAD_GROUP_BG, color: HEAD_TXT, borderColor: HEAD_BORDER };
  const headColStyle = { backgroundColor: HEAD_COL_BG, color: HEAD_TXT_MUTED, borderColor: HEAD_BORDER };
  const bodyTd = "whitespace-nowrap border border-[var(--border)] px-2 py-1.5";

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
            <div className="absolute right-0 z-20 mt-1 w-64 rounded-md border border-[var(--border)] bg-[var(--surface)] p-2 shadow-lg">
              <p className="px-2 pb-1 text-xs text-[var(--text-muted)]">
                Datos del edificio siempre visible.
              </p>
              {TOGGLEABLE.map((g) => (
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

      {/* Tableau : en-têtes sombres, lignes blanches, ~10 lignes + scroll + redimensionnable */}
      <div
        className="resize-y overflow-auto rounded-lg border border-[var(--border)] bg-[var(--surface)]"
        style={{ maxHeight: 440, minHeight: 160 }}
      >
        <table className="border-collapse text-xs text-[var(--text)]">
          <thead className="sticky top-0 z-10">
            {/* Bandeau des groupes */}
            <tr>
              <th colSpan={EDIFICIO.cols.length} className={groupTh} style={headGroupStyle}>
                {EDIFICIO.label}
              </th>
              {progVis && (
                <th colSpan={PROG_FASES.length} className={groupTh} style={headGroupStyle}>
                  Progresión
                </th>
              )}
              {dataVis.map((g) => (
                <th key={g.key} colSpan={g.cols.length} className={groupTh} style={headGroupStyle}>
                  {g.label}
                </th>
              ))}
            </tr>
            {/* En-têtes de colonnes */}
            <tr>
              {EDIFICIO.cols.map((c) => (
                <th
                  key={c.key}
                  className={cn(colTh, c.minW, c.align === "right" ? "text-right" : "text-left")}
                  style={headColStyle}
                >
                  {c.header}
                </th>
              ))}
              {progVis &&
                PROG_FASES.map((fa) => (
                  <th
                    key={fa.code}
                    title={fa.nombre}
                    className="border px-0 py-1 text-center align-bottom"
                    style={{ ...headColStyle, width: PROG_W, minWidth: PROG_W }}
                  >
                    <span
                      className="mx-auto inline-block text-[11px] font-medium leading-none"
                      style={{ writingMode: "vertical-rl" }}
                    >
                      {fa.nombre}
                    </span>
                  </th>
                ))}
              {dataVis.flatMap((g) =>
                g.cols.map((c) => (
                  <th
                    key={c.key}
                    className={cn(colTh, c.minW, c.align === "right" ? "text-right" : "text-left")}
                    style={headColStyle}
                  >
                    {c.header}
                  </th>
                )),
              )}
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.sub.uid} className="hover:bg-[var(--app-bg)]">
                {EDIFICIO.cols.map((c) => (
                  <td key={c.key} className={cn(bodyTd, c.align === "right" ? "text-right" : "text-left")}>
                    {c.display(f)}
                  </td>
                ))}
                {progVis &&
                  PROG_FASES.map((fa) => {
                    const est = f.estados[fa.code] ?? null;
                    const bg = est === "terminado" ? COL_TERM : est === "en_proceso" ? COL_PROC : undefined;
                    return (
                      <td
                        key={fa.code}
                        title={`${fa.nombre}: ${estadoLabel(est)}`}
                        className="border border-[var(--border)]"
                        style={{ width: PROG_W, minWidth: PROG_W, backgroundColor: bg }}
                      />
                    );
                  })}
                {dataVis.flatMap((g) =>
                  g.cols.map((c) => (
                    <td key={c.key} className={cn(bodyTd, c.align === "right" ? "text-right" : "text-left")}>
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
