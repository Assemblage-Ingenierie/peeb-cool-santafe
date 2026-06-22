"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { SnapshotSubproyecto, SnapshotMetrica, SnapshotFase, SnapshotMedida } from "@/lib/snapshot";
import { FASES, ESTADOS, MEDIDAS, getTipologia, UI } from "@/lib/constants";
import { MedidaIcon } from "@/components/medida-icons";
import { economiaKwh, economiaPct, porM2, suma } from "@/lib/calc";
import { fmtNumero, fmtPct } from "@/lib/format";
import { cn } from "@/lib/cn";

// ============================================================
// Tableau « Resumen » (mode Proyecto global) — 9 sous-projets × groupes de
// colonnes (CDC §4.1). En-têtes SOMBRES, lignes BLANCHES. Ordre : Tipo (1ʳᵉ col,
// lettre A/H/E) → Datos del edificio → Progresión (initiales + légende) →
// Medidas (logos allumés si activa) → Consumos → GEI → Costos → Beneficiarios.
// Clic sur un en-tête = tri croissant/décroissant. Calculs dérivés calculés ici.
// ============================================================

const HEAD_GROUP_BG = UI.text;
const HEAD_COL_BG = UI.sidebarBg;
const HEAD_TXT = UI.sidebarText;
const HEAD_TXT_MUTED = UI.sidebarTextMuted;
const HEAD_BORDER = UI.sidebarBorder;
const COL_TERM = ESTADOS.find((e) => e.code === "terminado")?.color ?? "#b6d7a8";
const COL_PROC = ESTADOS.find((e) => e.code === "en_proceso")?.color ?? "#ffd966";
const MED_OFF = "#c7ccd3"; // mesure inactive : logo gris clair

const PROG_W = 26; // colonnes Progresión (initiales horizontales)
const MED_W = 30; // colonnes Medidas (logos)
const PROG_FASES = FASES.filter((f) => f.code !== "general");

// Initiales des fases (en-tête compact + légende sous le tableau).
const FASE_INIT: Record<string, string> = {
  estudios_preliminares: "EP",
  anteproyecto: "AP",
  proyecto_ejecutivo: "PE",
  redaccion_pliegos: "PL",
  no_objecion_afd: "NO",
  licitacion: "LI",
  obra: "OB",
};

const estadoLabel = (e: string | null) =>
  e === "terminado" ? "Terminado" : e === "en_proceso" ? "En proceso" : "Sin iniciar";

interface Fila {
  sub: SnapshotSubproyecto;
  met: SnapshotMetrica | undefined; // escenario faisabilidad (le seul rempli)
  estados: Record<string, string | null>; // fase code → estado
  medidas: Set<string>; // codes des mesures actives
}

type SortVal = number | string | null;
interface Columna {
  key: string;
  header: string;
  align: "left" | "right";
  minW?: string;
  display: (f: Fila) => ReactNode;
  csv: (f: Fila) => string;
  sortVal: (f: Fila) => SortVal;
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
  sortVal: (f) => get(f),
});
const pctCol = (key: string, header: string, get: (f: Fila) => number | null): Columna => ({
  key,
  header,
  align: "right",
  display: (f) => fmtPct(get(f)),
  csv: (f) => csvNum(get(f)),
  sortVal: (f) => get(f),
});
const txtCol = (key: string, header: string, get: (f: Fila) => string, minW?: string): Columna => ({
  key,
  header,
  align: "left",
  minW,
  display: (f) => get(f),
  csv: (f) => get(f),
  sortVal: (f) => get(f),
});

const dem = (f: Fila) => f.met?.demanda_kwh ?? null;
const demDesp = (f: Fila) => f.met?.demanda_despues_kwh ?? null;

// Tipo en 1ʳᵉ colonne (lettre A/H/E), puis Edificio, puis Superficie.
const EDIFICIO: Grupo = {
  key: "edificio",
  label: "Datos del edificio",
  cols: [
    {
      key: "tipo",
      header: "Tipo",
      align: "left",
      display: (f) => <TipoBadge code={f.sub.tipologia} />,
      csv: (f) => getTipologia(f.sub.tipologia)?.nombre ?? f.sub.tipologia,
      sortVal: (f) => f.sub.tipologia,
    },
    txtCol("nombre", "Edificio", (f) => f.sub.nombre, "min-w-[200px]"),
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

// Masquables (Datos del edificio toujours affiché) : Progresión + Medidas + groupes de données.
const TOGGLEABLE = [
  { key: "progresion", label: "Progresión" },
  { key: "medidas", label: "Medidas" },
  ...DATA_GROUPS.map((g) => ({ key: g.key, label: g.label })),
];

// Lookup des colonnes triables (edificio + données).
const SORT_COLS = new Map<string, Columna>();
for (const c of EDIFICIO.cols) SORT_COLS.set(c.key, c);
for (const g of DATA_GROUPS) for (const c of g.cols) SORT_COLS.set(c.key, c);

function TipoBadge({ code }: { code: string }) {
  const tp = getTipologia(code);
  if (!tp) return <span>{code}</span>;
  return (
    <span
      className="inline-block w-5 rounded text-center text-[11px] font-bold leading-5"
      style={{ backgroundColor: tp.color, color: tp.onColor }}
      title={tp.nombre}
    >
      {tp.code}
    </span>
  );
}

interface GlobalTableProps {
  subproyectos: SnapshotSubproyecto[];
  metricas: SnapshotMetrica[];
  fases: SnapshotFase[];
  medidas: SnapshotMedida[];
}

type Sort = { key: string; dir: "asc" | "desc" } | null;

export function GlobalTable({ subproyectos, metricas, fases, medidas }: GlobalTableProps) {
  const [visible, setVisible] = useState<Set<string>>(() => new Set(TOGGLEABLE.map((g) => g.key)));
  const [sort, setSort] = useState<Sort>(null);

  const filas = useMemo<Fila[]>(() => {
    const metMap = new Map<string, SnapshotMetrica>();
    for (const m of metricas) if (m.escenario === "faisabilidad") metMap.set(m.subproyecto_uid, m);
    const faseMap = new Map<string, Record<string, string | null>>();
    for (const f of fases) {
      const r = faseMap.get(f.subproyecto_uid) ?? {};
      r[f.fase] = f.estado;
      faseMap.set(f.subproyecto_uid, r);
    }
    const medMap = new Map<string, Set<string>>();
    for (const m of medidas) {
      if (!m.activa) continue;
      const s = medMap.get(m.subproyecto_uid) ?? new Set<string>();
      s.add(m.medida);
      medMap.set(m.subproyecto_uid, s);
    }
    return subproyectos.map((sub) => ({
      sub,
      met: metMap.get(sub.uid),
      estados: faseMap.get(sub.uid) ?? {},
      medidas: medMap.get(sub.uid) ?? new Set<string>(),
    }));
  }, [subproyectos, metricas, fases, medidas]);

  const sortedFilas = useMemo(() => {
    if (!sort) return filas;
    const col = SORT_COLS.get(sort.key);
    if (!col) return filas;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filas].sort((a, b) => {
      const va = col.sortVal(a);
      const vb = col.sortVal(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1; // valeurs manquantes en dernier
      if (vb == null) return -1;
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb), "es", { numeric: true }) * dir;
    });
  }, [filas, sort]);

  // Lien d'export : reflète les colonnes visibles + le tri courant (= ce qu'on voit à l'écran).
  const exportHref = useMemo(() => {
    const groups = TOGGLEABLE.filter((g) => visible.has(g.key)).map((g) => g.key);
    const params = new URLSearchParams({ cols: groups.join(",") });
    if (sort) params.set("sort", `${sort.key}:${sort.dir}`);
    return `/api/export-resumen?${params.toString()}`;
  }, [visible, sort]);

  const progVis = visible.has("progresion");
  const medVis = visible.has("medidas");
  const dataVis = DATA_GROUPS.filter((g) => visible.has(g.key));

  const toggle = (key: string) =>
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const onSort = (key: string) =>
    setSort((p) => (p?.key === key ? { key, dir: p.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  // Styles d'en-tête (sombres) et de corps (clairs).
  const groupTh = "whitespace-nowrap border px-2 py-1.5 text-center text-xs font-semibold";
  const colTh = "border px-2 py-1.5 text-xs font-medium align-bottom";
  const headGroupStyle = { backgroundColor: HEAD_GROUP_BG, color: HEAD_TXT, borderColor: HEAD_BORDER };
  const headColStyle = { backgroundColor: HEAD_COL_BG, color: HEAD_TXT_MUTED, borderColor: HEAD_BORDER };
  const bodyTd = "whitespace-nowrap border border-[var(--border)] px-2 py-1.5";

  // En-tête de colonne triable (clic = croissant/décroissant).
  const SortTh = ({ c }: { c: Columna }) => {
    const active = sort?.key === c.key;
    return (
      <th
        className={cn(colTh, c.minW, c.align === "right" ? "text-right" : "text-left", "cursor-pointer select-none")}
        style={headColStyle}
        onClick={() => onSort(c.key)}
        aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : "none"}
        title="Ordenar"
      >
        {c.header}
        {active ? (sort!.dir === "asc" ? " ▲" : " ▼") : ""}
      </th>
    );
  };

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
              <p className="px-2 pb-1 text-xs text-[var(--text-muted)]">Datos del edificio siempre visible.</p>
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
          <a
            href={exportHref}
            className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--text)] hover:bg-[var(--app-bg)]"
          >
            Exportar Excel
          </a>
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
              {medVis && (
                <th colSpan={MEDIDAS.length} className={groupTh} style={headGroupStyle}>
                  Medidas
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
                <SortTh key={c.key} c={c} />
              ))}
              {progVis &&
                PROG_FASES.map((fa) => (
                  <th
                    key={fa.code}
                    title={fa.nombre}
                    className="border px-1 py-1.5 text-center align-bottom text-[11px] font-medium"
                    style={{ ...headColStyle, width: PROG_W, minWidth: PROG_W }}
                  >
                    {FASE_INIT[fa.code] ?? fa.nombre}
                  </th>
                ))}
              {medVis &&
                MEDIDAS.map((m) => (
                  <th
                    key={m.code}
                    title={m.nombre}
                    className="border px-0.5 py-1 text-center align-bottom"
                    style={{ ...headColStyle, width: MED_W, minWidth: MED_W }}
                  >
                    <span className="inline-flex">
                      <MedidaIcon code={m.code} size={16} />
                    </span>
                  </th>
                ))}
              {dataVis.flatMap((g) => g.cols.map((c) => <SortTh key={c.key} c={c} />))}
            </tr>
          </thead>
          <tbody>
            {sortedFilas.map((f) => (
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
                {medVis &&
                  MEDIDAS.map((m) => {
                    const on = f.medidas.has(m.code);
                    return (
                      <td
                        key={m.code}
                        title={`${m.nombre}: ${on ? "Sí" : "No"}`}
                        className="border border-[var(--border)] text-center align-middle"
                        style={{ width: MED_W, minWidth: MED_W }}
                      >
                        <span className="inline-flex">
                          <MedidaIcon code={m.code} size={16} color={on ? undefined : MED_OFF} />
                        </span>
                      </td>
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

      {/* Légende Progresión */}
      {progVis && (
        <p className="text-xs text-[var(--text-muted)]">
          <span className="font-medium">Progresión :</span>{" "}
          {PROG_FASES.map((fa) => `${FASE_INIT[fa.code]} = ${fa.nombre}`).join("  ·  ")}
        </p>
      )}
    </section>
  );
}
