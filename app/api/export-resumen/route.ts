import ExcelJS from "exceljs";
import { getSnapshot, type SnapshotMetrica, type SnapshotSubproyecto } from "@/lib/snapshot";
import { FASES, ESTADOS, MEDIDAS, getTipologia } from "@/lib/constants";
import { economiaKwh, economiaPct, porM2, suma } from "@/lib/calc";

// ============================================================
// GET /api/export-resumen — exporte le tableau « Resumen » en .xlsx mis en forme
// (mêmes colonnes/groupes que l'écran : Tipo lettre, Progresión, Medidas allumées,
// Consumos/GEI/Costos/Beneficiarios). Construit en service_role côté serveur.
// ============================================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROG_FASES = FASES.filter((f) => f.code !== "general");
const FASE_INIT: Record<string, string> = {
  estudios_preliminares: "EP",
  anteproyecto: "AP",
  proyecto_ejecutivo: "PE",
  redaccion_pliegos: "PL",
  no_objecion_afd: "NO",
  licitacion: "LI",
  obra: "OB",
};
const COL_TERM = ESTADOS.find((e) => e.code === "terminado")?.color ?? "#b6d7a8";
const COL_PROC = ESTADOS.find((e) => e.code === "en_proceso")?.color ?? "#ffd966";
const argb = (hex: string) => "FF" + hex.replace("#", "").toUpperCase();

interface Fila {
  sub: SnapshotSubproyecto;
  met: SnapshotMetrica | undefined;
  estados: Record<string, string | null>;
  medidas: Set<string>;
}

type Kind = "tipo" | "nombre" | "num" | "pct" | "prog" | "med";
interface ColDef {
  group: string;
  h: string;
  kind: Kind;
  w: number;
  get?: (f: Fila) => number | null;
  fmt?: string;
  rot?: boolean;
  fase?: string;
  code?: string;
  color?: string;
}

export async function GET() {
  const snap = await getSnapshot();

  const metMap = new Map<string, SnapshotMetrica>();
  for (const m of snap.metricas) if (m.escenario === "faisabilidad") metMap.set(m.subproyecto_uid, m);
  const faseMap = new Map<string, Record<string, string | null>>();
  for (const f of snap.fases) {
    const r = faseMap.get(f.subproyecto_uid) ?? {};
    r[f.fase] = f.estado;
    faseMap.set(f.subproyecto_uid, r);
  }
  const medMap = new Map<string, Set<string>>();
  for (const m of snap.medidas) {
    if (!m.activa) continue;
    const s = medMap.get(m.subproyecto_uid) ?? new Set<string>();
    s.add(m.medida);
    medMap.set(m.subproyecto_uid, s);
  }
  const filas: Fila[] = snap.subproyectos.map((sub) => ({
    sub,
    met: metMap.get(sub.uid),
    estados: faseMap.get(sub.uid) ?? {},
    medidas: medMap.get(sub.uid) ?? new Set<string>(),
  }));

  const dem = (f: Fila) => f.met?.demanda_kwh ?? null;
  const demD = (f: Fila) => f.met?.demanda_despues_kwh ?? null;
  const sup = (f: Fila) => f.sub.superficie_m2;
  const NUM = "#,##0", D1 = "#,##0.0", D3 = "#,##0.000", PCT = '#,##0.0" %"';
  const EDI = "Datos del edificio", CONS = "Consumos de energía (demanda teórica)";
  const GEI = "Emisiones de GEI", COST = "Costos de inversión", BEN = "Beneficiarios";

  const cols: ColDef[] = [
    { group: EDI, h: "Tipo", kind: "tipo", w: 7 },
    { group: EDI, h: "Edificio", kind: "nombre", w: 38 },
    { group: EDI, h: "Superficie (m²)", kind: "num", get: sup, fmt: NUM, w: 13 },
    ...PROG_FASES.map((fa): ColDef => ({ group: "Progresión", h: FASE_INIT[fa.code] ?? fa.code, kind: "prog", fase: fa.code, w: 5 })),
    ...MEDIDAS.map((m): ColDef => ({ group: "Medidas", h: m.nombre, kind: "med", code: m.code, color: m.color, w: 5, rot: true })),
    { group: CONS, h: "Antes (kWh)", kind: "num", get: dem, fmt: NUM, w: 13 },
    { group: CONS, h: "Antes (kWh/m²)", kind: "num", get: (f) => porM2(dem(f), sup(f)), fmt: D1, w: 13 },
    { group: CONS, h: "Después (kWh)", kind: "num", get: demD, fmt: NUM, w: 13 },
    { group: CONS, h: "Después (kWh/m²)", kind: "num", get: (f) => porM2(demD(f), sup(f)), fmt: D1, w: 14 },
    { group: CONS, h: "Ahorro (kWh)", kind: "num", get: (f) => economiaKwh(dem(f), demD(f)), fmt: NUM, w: 13 },
    { group: CONS, h: "Ahorro (kWh/m²)", kind: "num", get: (f) => porM2(economiaKwh(dem(f), demD(f)), sup(f)), fmt: D1, w: 14 },
    { group: CONS, h: "Ahorro (%)", kind: "pct", get: (f) => economiaPct(dem(f), demD(f)), fmt: PCT, w: 12 },
    { group: GEI, h: "Antes (tCO₂)", kind: "num", get: (f) => f.met?.gei_antes_tco2 ?? null, fmt: D1, w: 13 },
    { group: GEI, h: "Antes (tCO₂/m²)", kind: "num", get: (f) => porM2(f.met?.gei_antes_tco2 ?? null, sup(f)), fmt: D3, w: 14 },
    { group: GEI, h: "Después (tCO₂)", kind: "num", get: (f) => f.met?.gei_despues_tco2 ?? null, fmt: D1, w: 13 },
    { group: GEI, h: "Después (tCO₂/m²)", kind: "num", get: (f) => porM2(f.met?.gei_despues_tco2 ?? null, sup(f)), fmt: D3, w: 15 },
    { group: GEI, h: "Reducción (tCO₂)", kind: "num", get: (f) => economiaKwh(f.met?.gei_antes_tco2 ?? null, f.met?.gei_despues_tco2 ?? null), fmt: D1, w: 14 },
    { group: GEI, h: "Reducción (%)", kind: "pct", get: (f) => economiaPct(f.met?.gei_antes_tco2 ?? null, f.met?.gei_despues_tco2 ?? null), fmt: PCT, w: 12 },
    { group: COST, h: "EE (€)", kind: "num", get: (f) => f.met?.costo_ee_eur ?? null, fmt: NUM, w: 13 },
    { group: COST, h: "EE (€/m²)", kind: "num", get: (f) => porM2(f.met?.costo_ee_eur ?? null, sup(f)), fmt: NUM, w: 11 },
    { group: COST, h: "Otras (€)", kind: "num", get: (f) => f.met?.costo_otras_eur ?? null, fmt: NUM, w: 13 },
    { group: COST, h: "Otras (€/m²)", kind: "num", get: (f) => porM2(f.met?.costo_otras_eur ?? null, sup(f)), fmt: NUM, w: 11 },
    { group: COST, h: "Total (€)", kind: "num", get: (f) => suma(f.met?.costo_ee_eur ?? null, f.met?.costo_otras_eur ?? null), fmt: NUM, w: 13 },
    { group: COST, h: "Total (€/m²)", kind: "num", get: (f) => porM2(suma(f.met?.costo_ee_eur ?? null, f.met?.costo_otras_eur ?? null), sup(f)), fmt: NUM, w: 11 },
    { group: BEN, h: "Personal", kind: "num", get: (f) => f.met?.benef_personal ?? null, fmt: NUM, w: 12 },
    { group: BEN, h: "% mujeres", kind: "pct", get: (f) => f.met?.benef_personal_pct_muj ?? null, fmt: PCT, w: 11 },
    { group: BEN, h: "Usuarios", kind: "num", get: (f) => f.met?.benef_usuarios ?? null, fmt: NUM, w: 12 },
    { group: BEN, h: "% mujeres", kind: "pct", get: (f) => f.met?.benef_usuarios_pct_muj ?? null, fmt: PCT, w: 11 },
    { group: BEN, h: "Población cubierta", kind: "num", get: (f) => f.met?.benef_indirectos ?? null, fmt: NUM, w: 15 },
    { group: BEN, h: "% mujeres", kind: "pct", get: (f) => f.met?.benef_indirectos_pct_muj ?? null, fmt: PCT, w: 11 },
  ];

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Resumen", { views: [{ state: "frozen", xSplit: 2, ySplit: 2 }] });
  const thin = { style: "thin" as const, color: { argb: "FFDADCE0" } };
  const border = { top: thin, left: thin, bottom: thin, right: thin };

  ws.getRow(1).height = 22;
  ws.getRow(2).height = 46;

  // Ligne 1 : groupes fusionnés.
  const groups: { label: string; start: number; end: number }[] = [];
  cols.forEach((col, i) => {
    const idx = i + 1;
    const last = groups[groups.length - 1];
    if (last && last.label === col.group) last.end = idx;
    else groups.push({ label: col.group, start: idx, end: idx });
  });
  for (const gr of groups) {
    if (gr.end > gr.start) ws.mergeCells(1, gr.start, 1, gr.end);
    const cell = ws.getCell(1, gr.start);
    cell.value = gr.label;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb("#272a33") } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = border;
  }

  // Ligne 2 : en-têtes de colonnes.
  cols.forEach((col, i) => {
    const cell = ws.getCell(2, i + 1);
    cell.value = col.h;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb("#30323e") } };
    cell.font = { color: { argb: "FFCDD2DA" }, size: 10, bold: col.kind !== "med" };
    cell.alignment = {
      horizontal: col.kind === "num" || col.kind === "pct" ? "right" : "center",
      vertical: "bottom",
      textRotation: col.rot ? 90 : 0,
      wrapText: true,
    };
    cell.border = border;
    ws.getColumn(i + 1).width = col.w;
  });

  // Lignes de données.
  filas.forEach((f, ri) => {
    const row = ws.getRow(3 + ri);
    cols.forEach((col, i) => {
      const cell = row.getCell(i + 1);
      cell.border = border;
      if (col.kind === "tipo") {
        const tp = getTipologia(f.sub.tipologia);
        cell.value = tp?.code ?? f.sub.tipologia;
        if (tp) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(tp.color) } };
          cell.font = { bold: true, color: { argb: argb(tp.onColor) } };
        }
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else if (col.kind === "nombre") {
        cell.value = f.sub.nombre;
        cell.alignment = { horizontal: "left", vertical: "middle" };
      } else if (col.kind === "prog") {
        const est = f.estados[col.fase as string] ?? null;
        const fill = est === "terminado" ? COL_TERM : est === "en_proceso" ? COL_PROC : null;
        if (fill) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(fill) } };
      } else if (col.kind === "med") {
        const on = f.medidas.has(col.code as string);
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: on ? argb(col.color as string) : "FFECEEF1" } };
      } else {
        const v = col.get ? col.get(f) : null;
        if (v != null && !Number.isNaN(v)) {
          cell.value = v;
          cell.numFmt = col.fmt as string;
        }
        cell.alignment = { horizontal: "right", vertical: "middle" };
      }
    });
  });

  // Légende Progresión (sous le tableau).
  const legRow = 3 + filas.length + 1;
  ws.mergeCells(legRow, 1, legRow, Math.min(cols.length, 12));
  const leg = ws.getCell(legRow, 1);
  leg.value = "Progresión:  " + PROG_FASES.map((fa) => `${FASE_INIT[fa.code]} = ${fa.nombre}`).join("   ·   ");
  leg.font = { italic: true, size: 9, color: { argb: "FF646B78" } };

  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="PEEB-resumen-proyecto.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
