// ============================================================
// Export SVG du cronograma (Gantt) — rejoue le MÊME modèle `Seccion[]` que la
// vue à l'écran (positions en ms absolus), déroulé sur toute la largeur et
// recadré sur la plage occupée, avec un en-tête (titre · sous-titre · légende).
//
// Mise en page d'export (choix client, août 2026) :
//   • PAS de colonne de gauche par défaut : le libellé est écrit À CÔTÉ de sa
//     barre, avec les dates début → fin en gris clair à écart FIXE (`dx`). Si le
//     libellé déborderait trop à droite ET qu'il y a la place, il bascule À
//     GAUCHE de la barre (aligné à droite, dates collées avant la barre).
//   • `columnaIzq` (vue globale) : une VRAIE colonne de noms à gauche (les 27
//     sous-projets alignés), la frise commençant après. Pas de texte à côté des
//     barres dans ce mode.
//   • `cropEndMs` borne la droite de l'axe (ex. PAG arrêté fin 2027) : les
//     barres qui dépassent sont coupées au bord, les lignes qui commencent
//     après la borne sont retirées.
//   • Vue compacte : seulement la ligne-titre de chaque fase.
//
// Vectoriel = net à toute échelle → idéal en pièce jointe de rapport. Aucun
// import React : consommable côté client (téléchargement / rasterisation canvas)
// comme côté serveur. Le PNG se dérive du SVG (canvas), le PDF encapsule le PNG.
// ============================================================

import type { Barra, Seccion } from "@/components/cronograma/cronograma-client";

export interface LeyendaItem {
  label: string;
  color: string;
  borde?: string;
  texto?: string;
}

export interface CronogramaSvgOpts {
  secciones: Seccion[];
  titulo: string;
  subtitulo?: string;
  leyenda?: LeyendaItem[];
  hoyMs?: number | null;
  compacta?: boolean;
  pxPorDia?: number;
  // Bornes de l'axe (ms) : les barres au-delà sont coupées, les lignes hors
  // fenêtre retirées. Défaut = plage occupée + marge. Le sélecteur de plage
  // « Exportar » les renseigne (début / fin choisis par l'utilisateur).
  cropStartMs?: number;
  cropEndMs?: number;
  // Largeur d'une colonne de noms à gauche (px). 0 = pas de colonne (défaut).
  columnaIzq?: number;
}

// --- Géométrie / charte de l'export -----------------------------------------
const PAD = 20;
const PAD_L = 16;
const ROW_H = 22;
const HEAD_GANTT = 34;
const GAP = 6;
const ACCENT = "#d4351f";
const C = {
  band: "#eceef2",
  grid: "#e6e8ec",
  gridStrong: "#d5d9df",
  text: "#1f2733",
  muted: "#6b7280",
  dateMuted: "#a3a8b2",
  surface: "#ffffff",
};
const MES_ABBR = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DAY = 86_400_000;

const textW = (s: string, size: number) => s.length * size * 0.56;
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// Tronque un texte pour tenir dans `maxPx` (ajoute « … »).
function trunc(s: string, maxPx: number, size: number): string {
  if (textW(s, size) <= maxPx) return s;
  let t = s;
  while (t.length > 1 && textW(t + "…", size) > maxPx) t = t.slice(0, -1);
  return t + "…";
}
const fFecha = (ms: number): string => {
  const d = new Date(ms);
  return `${d.getDate()} ${MES_ABBR[d.getMonth()]} ${d.getFullYear()}`;
};
const fechasBarra = (b: Barra): string =>
  b.rombo ? fFecha(b.startMs) : `${fFecha(b.startMs)} → ${fFecha(b.endMs)}`;

function primerDiaMes(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}
function siguienteMes(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
}

interface RenderRow {
  tipo: "titulo" | "tarea";
  label: string;
  barras: Barra[];
  atrasada?: boolean;
  separaGrupo?: boolean;
}

export function renderCronogramaSVG(opts: CronogramaSvgOpts): string {
  const { secciones, titulo, subtitulo, hoyMs = null, compacta = false } = opts;
  const pxPorDia = opts.pxPorDia ?? 1.5;
  const colW = opts.columnaIzq ?? 0;
  const leyenda = compacta ? [] : opts.leyenda ?? [];

  // 1) Lignes à dessiner.
  const rows: RenderRow[] = [];
  for (const s of secciones) {
    rows.push({ tipo: "titulo", label: s.titulo, barras: s.barras });
    if (!compacta)
      for (const f of s.filas)
        rows.push({ tipo: "tarea", label: f.label, barras: f.barras, atrasada: f.check?.atrasada, separaGrupo: f.separaGrupo });
  }

  // 2) Plage temporelle occupée (recadrage) — marge d'un mois de chaque côté.
  const barras: Barra[] = [];
  for (const r of rows) barras.push(...r.barras);
  const conFecha = barras.filter((b) => Number.isFinite(b.startMs));
  const minMs = conFecha.length ? Math.min(...conFecha.map((b) => b.startMs)) : Date.now();
  const maxMs = conFecha.length ? Math.max(...conFecha.map((b) => b.endMs)) : Date.now() + 365 * DAY;
  const cropStart = opts.cropStartMs ?? primerDiaMes(minMs - 20 * DAY);
  const cropEnd = opts.cropEndMs ?? siguienteMes(maxMs + 10 * DAY);
  const axisLeft = PAD_L + colW;
  const x = (ms: number) => axisLeft + ((ms - cropStart) / DAY) * pxPorDia;
  const axisEnd = x(cropEnd);
  const targetRight = axisEnd + 24;

  // Retire les lignes-tarea dont la barre est ENTIÈREMENT hors fenêtre.
  const rowsVis = rows.filter((r) => {
    if (r.tipo === "titulo") return true;
    const b = r.barras[0];
    return !b || (b.endMs > cropStart && b.startMs < cropEnd);
  });

  // 3) Étiquettes (mode SANS colonne) : nom + dates, à droite ou basculé à gauche.
  interface Etq {
    inner: string;
    x: number;
    anchor: "start" | "end";
    right: number;
  }
  const etqDe = (row: RenderRow): Etq | null => {
    if (colW > 0) return null; // en mode colonne, pas de texte à côté des barres
    const b = row.barras[0];
    const size = row.tipo === "titulo" ? 12 : 10;
    const weight = row.tipo === "titulo" ? 700 : 400;
    const fechas = b ? fechasBarra(b) : "";
    let inner = `<tspan font-size="${size}" font-weight="${weight}" fill="${C.text}">${esc(row.label)}</tspan>`;
    if (fechas) inner += `<tspan dx="${GAP}" font-size="9" fill="${C.dateMuted}">${esc(fechas)}</tspan>`;
    if (row.atrasada) inner += `<tspan dx="7" font-size="8" font-weight="700" fill="${ACCENT}">ATRASADA</tspan>`;
    const w = textW(row.label, size) + (fechas ? GAP + textW(fechas, 9) : 0) + (row.atrasada ? 7 + textW("ATRASADA", 8) : 0);
    if (!b) return { inner, x: axisLeft, anchor: "start", right: axisLeft + w };
    // Fin visible de la barre (bornée à droite).
    const visEnd = Math.min(b.rombo ? x(b.startMs) : x(b.endMs), axisEnd);
    const rx = b.rombo ? Math.min(x(b.startMs), axisEnd) + 9 : visEnd + GAP;
    const ex = x(b.startMs) - (b.rombo ? 9 : GAP);
    // Bascule à gauche seulement si le début est dans la fenêtre ET qu'il y a la place.
    const cabeIzq = b.startMs >= cropStart && ex - w >= axisLeft;
    if (rx + w <= targetRight || !cabeIzq) return { inner, x: rx, anchor: "start", right: rx + w };
    return { inner, x: ex, anchor: "end", right: ex };
  };
  const etqs = rowsVis.map(etqDe);

  // 4) Dimensions.
  const legendH = leyenda.length ? 22 : 0;
  const headerH = PAD + 22 + (subtitulo ? 18 : 0) + legendH + 8;
  const gridTop = headerH + HEAD_GANTT;
  const bodyBottom = gridTop + rowsVis.length * ROW_H;
  // En mode colonne, le nom RÉPÉTÉ en fin de frise doit compter dans la largeur.
  let colEchoRight = 0;
  if (colW > 0)
    for (const row of rowsVis) {
      if (row.tipo === "titulo") continue;
      const conF = row.barras.filter((b) => Number.isFinite(b.startMs));
      if (!conF.length) continue;
      const lastRight = Math.min(Math.max(...conF.map((b) => x(b.endMs))), axisEnd);
      if (lastRight - axisLeft > 300) colEchoRight = Math.max(colEchoRight, lastRight + GAP + textW(row.label, 10));
    }
  const maxRight = Math.max(axisEnd, colEchoRight, ...etqs.map((e) => e?.right ?? 0));
  const totalW = Math.ceil(maxRight + PAD);
  const totalH = Math.ceil(bodyBottom + PAD);

  const P: string[] = [];
  P.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}" font-family="Segoe UI, Roboto, Helvetica, Arial, sans-serif">`,
  );

  // Patterns de hachure (excédent de durée).
  const hachColors = new Set<string>();
  for (const b of barras) if (b.endMs > b.solidMs && !b.rombo) hachColors.add(b.color);
  P.push("<defs>");
  for (const col of hachColors) {
    const id = "h" + col.replace(/[^a-z0-9]/gi, "");
    P.push(
      `<pattern id="${id}" width="10" height="10" patternTransform="rotate(45)" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#ffffff"/><rect width="5" height="10" fill="${col}"/></pattern>`,
    );
  }
  P.push("</defs>");
  P.push(`<rect x="0" y="0" width="${totalW}" height="${totalH}" fill="${C.surface}"/>`);

  // --- En-tête -------------------------------------------------------------
  P.push(`<text x="${PAD}" y="${PAD + 16}" font-size="16" font-weight="700" fill="${C.text}">${esc(titulo)}</text>`);
  let hy = PAD + 22;
  if (subtitulo) {
    hy += 16;
    P.push(`<text x="${PAD}" y="${hy}" font-size="11" fill="${C.muted}">${esc(subtitulo)}</text>`);
  }
  if (leyenda.length) {
    hy += legendH - 4;
    let lx = PAD;
    for (const it of leyenda) {
      P.push(`<rect x="${lx}" y="${hy - 9}" width="18" height="11" rx="2" fill="${it.color}"${it.borde ? ` stroke="${it.borde}"` : ""}/>`);
      lx += 22;
      const t = it.texto ?? it.label;
      P.push(`<text x="${lx}" y="${hy}" font-size="10" fill="${C.muted}">${esc(t)}</text>`);
      lx += textW(t, 10) + 16;
    }
  }

  // --- Axe (années + mois) -------------------------------------------------
  P.push(`<rect x="${axisLeft}" y="${headerH}" width="${axisEnd - axisLeft}" height="${HEAD_GANTT}" fill="#f6f7f9"/>`);
  const y0 = new Date(cropStart).getFullYear();
  const y1 = new Date(cropEnd).getFullYear();
  for (let y = y0; y <= y1; y += 1) {
    const l = Math.max(x(new Date(y, 0, 1).getTime()), axisLeft);
    const r = Math.min(x(new Date(y + 1, 0, 1).getTime()), axisEnd);
    if (r <= axisLeft || l >= axisEnd) continue;
    P.push(`<line x1="${l}" y1="${headerH}" x2="${l}" y2="${bodyBottom}" stroke="${C.gridStrong}" stroke-width="1"/>`);
    P.push(`<text x="${(l + r) / 2}" y="${headerH + 13}" font-size="11" font-weight="700" fill="${C.text}" text-anchor="middle">${y}</text>`);
  }
  let m = primerDiaMes(cropStart);
  while (m < cropEnd) {
    const l = x(m);
    const nxt = siguienteMes(m);
    if (l >= axisLeft && l <= axisEnd) {
      P.push(`<line x1="${l}" y1="${headerH + 16}" x2="${l}" y2="${bodyBottom}" stroke="${C.grid}" stroke-width="1"/>`);
      const mid = (l + Math.min(x(nxt), axisEnd)) / 2;
      if (x(nxt) - l > 16)
        P.push(`<text x="${mid}" y="${headerH + 29}" font-size="9" fill="${C.muted}" text-anchor="middle">${MES_ABBR[new Date(m).getMonth()]}</text>`);
    }
    m = nxt;
  }

  // --- Lignes --------------------------------------------------------------
  let ry = gridTop;
  rowsVis.forEach((row, i) => {
    const esTitulo = row.tipo === "titulo";
    if (row.separaGrupo) {
      P.push(`<rect x="0" y="${ry}" width="${totalW}" height="3" fill="#f0f1f4"/>`);
      ry += 3;
    }
    if (esTitulo) P.push(`<rect x="0" y="${ry}" width="${totalW}" height="${ROW_H}" fill="${C.band}"/>`);
    P.push(`<line x1="0" y1="${ry + ROW_H}" x2="${totalW}" y2="${ry + ROW_H}" stroke="${C.grid}" stroke-width="1"/>`);

    for (const b of row.barras) drawBarra(P, b, ry, x, axisLeft, axisEnd);

    if (colW > 0) {
      // Colonne de noms à gauche (tronquée à la largeur de colonne).
      const size = esTitulo ? 11 : 10;
      const txt = trunc(row.label, colW - 8, size);
      P.push(
        `<text x="${PAD_L}" y="${ry + ROW_H / 2 + 3.5}" font-size="${size}" font-weight="${esTitulo ? 700 : 400}" fill="${C.text}">${esc(txt)}</text>`,
      );
      // Nom RÉPÉTÉ à côté de la barre quand la frise s'étend loin de la colonne :
      // en gris, juste APRÈS le dernier segment (près de l'obra) — c'est là que
      // le nom du sous-projet est le plus loin de la colonne de gauche.
      const conF = row.barras.filter((b) => Number.isFinite(b.startMs));
      if (!esTitulo && conF.length) {
        const lastRight = Math.min(Math.max(...conF.map((b) => x(b.endMs))), axisEnd);
        if (lastRight - axisLeft > 300)
          P.push(
            `<text x="${lastRight + GAP}" y="${ry + ROW_H / 2 + 3.5}" font-size="10" fill="${C.muted}">${esc(row.label)}</text>`,
          );
      }
    } else {
      const e = etqs[i];
      if (e)
        P.push(`<text x="${e.x}" y="${ry + ROW_H / 2 + 3.5}"${e.anchor === "end" ? ' text-anchor="end"' : ""}>${e.inner}</text>`);
    }

    ry += ROW_H;
  });

  // Séparateur vertical de la colonne de noms.
  if (colW > 0) P.push(`<line x1="${axisLeft}" y1="${headerH}" x2="${axisLeft}" y2="${bodyBottom}" stroke="${C.gridStrong}" stroke-width="1"/>`);

  // « hoy ».
  if (hoyMs != null && hoyMs >= cropStart && hoyMs <= cropEnd) {
    const hx = x(hoyMs);
    P.push(`<line x1="${hx}" y1="${headerH}" x2="${hx}" y2="${bodyBottom}" stroke="${ACCENT}" stroke-width="1.5"/>`);
    P.push(`<text x="${hx + 3}" y="${headerH + 10}" font-size="8" font-weight="700" fill="${ACCENT}">hoy</text>`);
  }

  P.push("</svg>");
  return P.join("");
}

function drawBarra(P: string[], b: Barra, ry: number, x: (ms: number) => number, axisLeft: number, axisEnd: number): void {
  if (b.rombo) {
    const cx = x(b.startMs);
    if (cx < axisLeft || cx > axisEnd) return;
    const cy = ry + ROW_H / 2;
    P.push(`<rect x="${cx - 5}" y="${cy - 5}" width="10" height="10" fill="${b.color}" transform="rotate(45 ${cx} ${cy})"/>`);
    return;
  }
  // Barres bornées aux deux côtés (fenêtre) : l'excédent hors cadre est coupé.
  const left = Math.max(x(b.startMs), axisLeft);
  const rPlena = Math.min(Math.max(x(b.solidMs), axisLeft), axisEnd);
  const rFin = Math.min(x(b.endMs), axisEnd);
  if (x(b.endMs) <= axisLeft || left >= axisEnd) return;
  const wPlena = Math.max(2, rPlena - left);
  P.push(
    `<rect x="${left}" y="${ry + 3}" width="${wPlena}" height="${ROW_H - 6}" rx="2" fill="${b.color}"${b.borde ? ` stroke="${b.borde}"` : ""}/>`,
  );
  if (rFin > rPlena) {
    const id = "h" + b.color.replace(/[^a-z0-9]/gi, "");
    P.push(`<rect x="${rPlena}" y="${ry + 3}" width="${rFin - rPlena}" height="${ROW_H - 6}" fill="url(#${id})"/>`);
  }
  const interior = b.interior ?? (b.dentro ? b.etiquetaCorta ?? b.etiqueta : undefined);
  if (interior && textW(interior, 10) + 8 <= wPlena) {
    P.push(
      `<text x="${left + 5}" y="${ry + ROW_H / 2 + 3.5}" font-size="10" font-weight="600" fill="${b.interiorColor ?? b.etiquetaColor ?? "#ffffff"}">${esc(interior)}</text>`,
    );
  }
}
