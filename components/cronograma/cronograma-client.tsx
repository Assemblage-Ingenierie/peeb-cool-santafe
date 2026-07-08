"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import {
  CARD_TONOS,
  GESTION_FASES,
  type ComponenteCode,
} from "@/lib/constants";
import { SUBPROYECTOS_HIPOTETICOS } from "@/lib/subproyectos-hipoteticos";
import { construirCartasPorFila, type RoadmapOverride } from "@/lib/roadmap";
import { computeSchedule, faseNodeKey, type ScheduleResult, type Unidad } from "@/lib/schedule";
import { useSnapshot } from "@/components/dashboard/use-snapshot";
import type { Snapshot } from "@/lib/snapshot";
import { useComponentFilters } from "@/components/filter-context";

// ============================================================
// Cronograma (Gantt) — branché sur le MOTEUR de planning (lib/schedule) : les
// barres sont positionnées par les dates CALCULÉES (durées + liaisons + ancres de
// phase), identiques à la feuille de route. Barre PLEINE = durée estimée ;
// excédent HACHURÉ = jusqu'à la fecha_fin. Axe : semana / mes / trimestre.
//   • Sous-projet : section « Fases » (barres de phase) + une section par
//     composante (cartes), filtrées par « Vista / Rol ».
//   • Proyecto global : une ligne par sous-projet (durée totale calculée).
// ============================================================

type Gran = "semana" | "mes" | "trimestre";
type Seleccion = "global" | string;

const PROJECT_START = "2026-01-01";

// Fenêtre temporelle affichée : 2026 → 2030 inclus.
const ANIO_INI = 2026;
const ANIO_FIN = 2030;
const START = new Date(ANIO_INI, 0, 1).getTime();
const END = new Date(ANIO_FIN + 1, 0, 1).getTime();
const SPAN = END - START;

const LABEL_W = 300;
const ROW_H = 28;
// Largeur d'UNE case, IDENTIQUE quelle que soit la granularité : changer de
// vue = zoomer (une case de trimestre fait la même largeur qu'une case de mois
// ou de semaine). Le nombre de cases change (≈20 en trimestre, 60 en mes, 260
// en semana) → plus la granularité est fine, plus l'échelle est « zoomée ».
const CELL_W = 56;
// Date à laquelle démarre la visibilité au chargement (auto-scroll horizontal).
const VISTA_INICIO = new Date(2026, 5, 1).getTime(); // juin 2026
const MES_ABBR = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// Bleus progressifs pour les barres de phase (clair → foncé).
const BLUES = ["#cfe2f3", "#9fc5e8", "#6fa8dc", "#3d85c6", "#0b5394", "#073763"];
// Rouge des fases « No objeción AFD » (jalons critiques mis en évidence).
const ROJO_AFD = "#cc0000";
// Couleurs spécifiques par fase (priment sur le dégradé de bleus).
const FASE_COLOR: Record<string, string> = {
  licitacion: "#ea9999",
  obra: "#e69138",
};

// Sigles des fases sur les frises (comme le tableau Inicio). Règles :
// « validacion_anteproyecto » → rien ; toutes les « No objeción AFD » → « CNO ».
const FASE_SIGLA: Record<string, string> = {
  estudios_preliminares: "EP",
  anteproyecto: "AP",
  validacion_anteproyecto: "",
  proyecto_ejecutivo: "PE",
  redaccion_pliegos: "PL",
  no_objecion_afd: "CNO",
  licitacion: "LI",
  no_objecion_afd_atribucion: "CNO",
  no_objecion_afd_contrato: "CNO",
  obra: "OB",
};

// Fases affichées dans la légende (au-dessus du cronograma), dans l'ordre.
const LEYENDA_FASES = [
  "estudios_preliminares",
  "anteproyecto",
  "proyecto_ejecutivo",
  "redaccion_pliegos",
  "no_objecion_afd",
  "licitacion",
  "obra",
];

// Couleur de texte lisible sur un fond donné (luminance perçue).
function textoSobre(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#1f2733" : "#ffffff";
}

// Jalons rendus comme tareas GP (grises) DANS leur phase, et non comme des
// phases distinctes. Clé = code de fase parente → jalon. « Validación de
// anteproyecto » est une tarea GP de la phase Anteproyecto (pas une fase).
const HITO_COMO_TAREA: Record<string, { code: string; nombre: string }> = {
  anteproyecto: { code: "validacion_anteproyecto", nombre: "Validación de anteproyecto" },
};
// Codes de « fase » qui ne doivent PAS avoir leur propre bande (rendus en tarea).
const FASES_OCULTAS = new Set(Object.values(HITO_COMO_TAREA).map((h) => h.code));

// Phases affichées (ordre chronologique canonique, hors « general » et hors
// jalons rendus comme tareas).
const FASES_ORD = GESTION_FASES.filter(
  (f) => f.code !== "general" && !FASES_OCULTAS.has(f.code),
);
// Composantes en sections (ordre d'affichage).
const COMPS: ComponenteCode[] = ["GP", "EE", "AyS", "G"];

const asUnidad = (u: string | null | undefined): Unidad | null =>
  u === "dia" || u === "semana" || u === "mes" ? u : null;

// Date ISO (YYYY-MM-DD) → ms locaux.
function isoMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime() : null;
}

interface UnidadEje {
  start: number;
  label: string;
  anio: number;
}

function construirUnidades(gran: Gran): UnidadEje[] {
  const out: UnidadEje[] = [];
  if (gran === "trimestre") {
    for (let y = ANIO_INI; y <= ANIO_FIN; y += 1)
      for (let q = 0; q < 4; q += 1)
        out.push({ start: new Date(y, q * 3, 1).getTime(), label: `T${q + 1}`, anio: y });
  } else if (gran === "mes") {
    for (let y = ANIO_INI; y <= ANIO_FIN; y += 1)
      for (let m = 0; m < 12; m += 1)
        out.push({ start: new Date(y, m, 1).getTime(), label: MES_ABBR[m], anio: y });
  } else {
    let d = START;
    const WEEK = 7 * 24 * 3600 * 1000;
    while (d < END) {
      out.push({ start: d, label: "", anio: new Date(d).getFullYear() });
      d += WEEK;
    }
  }
  return out;
}

function isoWeek(ms: number): number {
  const d = new Date(ms);
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - day + 3);
  const firstThu = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const diff = (date.getTime() - firstThu.getTime()) / 86400000;
  return 1 + Math.round((diff - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
}

// --- Modèle du Gantt (positions en ms absolus) ------------------------------

interface Barra {
  startMs: number;
  solidMs: number; // fin de la barre pleine (début + durée)
  endMs: number; // fin réelle (hachures de solidMs → endMs si > solidMs)
  color: string;
  etiqueta?: string;
  dentro?: boolean;
  etiquetaColor?: string;
  tooltip?: string; // survol (title) — sans texte visible sur la barre
}
interface Fila {
  label: string;
  bold?: boolean;
  barras: Barra[];
}
interface Seccion {
  titulo: string;
  barras: Barra[]; // barre de la fase — rendue sur la LIGNE DU TITRE (bande grise)
  filas: Fila[]; // tareas (masquées quand la section est repliée)
}

function barraDe(
  sr: ScheduleResult | undefined,
  color: string,
  etiqueta: string,
  dentro: boolean,
  etiquetaColor?: string,
): Barra | null {
  if (!sr) return null;
  const s = isoMs(sr.start);
  if (s == null) return null;
  const so = isoMs(sr.solidEnd) ?? s;
  const e = isoMs(sr.end) ?? so;
  return { startMs: s, solidMs: so, endMs: e, color, etiqueta, dentro, etiquetaColor };
}

// Assemble le planning d'un sous-projet (mêmes entrées que la feuille de route).
function armar(uid: string, tipologia: string, d: Snapshot) {
  const estado = new Map<string, RoadmapOverride>();
  const planes = new Map<
    string,
    { durValor: number | null; durUnidad: string | null; fechaInicio: string | null; fechaFin: string | null }
  >();
  for (const r of d.roadmapEstado) {
    if (r.feuille !== uid) continue;
    estado.set(r.tareaKey, {
      oculta: r.oculta,
      creada: r.creada,
      componente: (r.componente as ComponenteCode | null) ?? null,
      fila: r.fila,
      orden: r.orden,
      nombre: r.nombre,
    });
    planes.set(r.tareaKey, {
      durValor: r.durValor,
      durUnidad: r.durUnidad,
      fechaInicio: r.fechaInicio,
      fechaFin: r.fechaFin,
    });
  }
  const columnas = construirCartasPorFila({ esGlobal: false, tipologia, uid, estado });
  const tasks: {
    key: string;
    fase: string;
    durValor: number | null;
    durUnidad: Unidad | null;
    fechaInicio: string | null;
    fechaFin: string | null;
  }[] = [];
  for (const [colKey, cards] of columnas) {
    const fila = colKey.split("|")[0];
    for (const c of cards) {
      if (c.nota) continue;
      const p = planes.get(c.key);
      tasks.push({
        key: c.key,
        fase: fila,
        durValor: p?.durValor ?? null,
        durUnidad: asUnidad(p?.durUnidad),
        fechaInicio: p?.fechaInicio ?? null,
        fechaFin: p?.fechaFin ?? null,
      });
    }
  }
  const faseInicio: Record<string, string | null> = {};
  for (const f of d.fases) {
    if (f.subproyecto_uid !== uid) continue;
    faseInicio[f.fase] = f.fecha_inicio;
    tasks.push({
      key: faseNodeKey(f.fase),
      fase: "",
      durValor: f.dur_valor,
      durUnidad: asUnidad(f.dur_unidad),
      fechaInicio: f.fecha_inicio,
      fechaFin: f.fecha_fin,
    });
  }
  const links = d.roadmapEnlace
    .filter((e) => e.feuille === uid)
    .map((e) => ({
      desde: e.desde,
      hacia: e.hacia,
      punto: e.punto,
      desfaseValor: e.desfaseValor,
      desfaseUnidad: e.desfaseUnidad,
    }));
  const sched = computeSchedule({ tasks, links, faseInicio, projectStart: PROJECT_START });
  return { columnas, sched };
}

// Couleur d'une fase (bande de temps) : bleu progressif par ordre, ROUGE pour
// « No objeción AFD » et ses jalons. Source unique (global + détail par fase).
const colorFase = (code: string, i: number): string =>
  FASE_COLOR[code] ?? (code.includes("no_objecion_afd") ? ROJO_AFD : BLUES[i % BLUES.length]);

// Couleur d'une fase par son code (index dans l'ordre canonique) — pour la légende.
const colorDeFase = (code: string): string =>
  colorFase(code, FASES_ORD.findIndex((f) => f.code === code));

// Barre d'une fase avec son sigle centré (texte lisible selon le fond).
function barraFase(sr: ScheduleResult | undefined, code: string, i: number, tooltip?: string): Barra | null {
  const color = colorFase(code, i);
  const b = barraDe(sr, color, FASE_SIGLA[code] ?? "", true, textoSobre(color));
  return b ? { ...b, tooltip } : null;
}

// Date courte (survol des segments de fase) — ex. « 3 jun 2027 ».
const fmtFecha = (ms: number): string => {
  const d = new Date(ms);
  return `${d.getDate()} ${MES_ABBR[d.getMonth()]} ${d.getFullYear()}`;
};

// Enchaînement des fases d'un planning sur UNE ligne (segments colorés, sigle
// centré ; nom + date de démarrage au survol).
function barrasFases(sched: Map<string, ScheduleResult>): Barra[] {
  const barras: Barra[] = [];
  FASES_ORD.forEach((f, i) => {
    const sr = sched.get(faseNodeKey(f.code));
    const b = barraFase(sr, f.code, i, sr ? `${f.nombre} · inicio ${fmtFecha(isoMs(sr.start) ?? 0)}` : undefined);
    if (b) barras.push(b);
  });
  return barras;
}

// Sections d'un sous-projet : UNE section (bande noire) PAR FASE. Dans chaque
// fase : 1re ligne = la barre de la fase elle-même (sa ligne de temps), puis les
// tareas regroupées par composante (GP → EE → AyS → G), les unes sous les autres.
function seccionesSub(uid: string, tipologia: string, d: Snapshot, filtros: Set<string>): Seccion[] {
  const { columnas, sched } = armar(uid, tipologia, d);
  const out: Seccion[] = [];

  FASES_ORD.forEach((f, i) => {
    // Barre de la fase : rendue sur la ligne du TITRE (plus de ligne dédiée).
    // Sigle centré ; « No objeción AFD » (et ses jalons) en rouge.
    const bFase = barraFase(sched.get(faseNodeKey(f.code)), f.code, i);

    // Tareas de la fase, regroupées par composante (ordre COMPS), triées par début.
    const filas: Fila[] = [];
    for (const comp of COMPS) {
      if (!filtros.has(comp)) continue;
      const cards = [...(columnas.get(`${f.code}|${comp}`) ?? [])].filter((c) => !c.nota);
      // Jalon rendu comme tarea GP de la phase (ex. Validación de anteproyecto).
      const hito = comp === "GP" ? HITO_COMO_TAREA[f.code] : undefined;
      if (hito) cards.push({ key: faseNodeKey(hito.code), componente: "GP", nombre: hito.nombre });
      if (cards.length === 0) continue;
      cards
        .map((c) => {
          // Tons CLAIRS de composante (en-tête de carte) pour les détails.
          const b = barraDe(sched.get(c.key), CARD_TONOS[comp].head, c.nombre, false, CARD_TONOS[comp].headText);
          return { label: c.nombre, barras: b ? [b] : [], _s: b ? b.startMs : Infinity };
        })
        .sort((a, b) => a._s - b._s)
        .forEach(({ label, barras }) => filas.push({ label, barras }));
    }

    // On masque une fase entièrement vide (pas de barre + aucune tarea visible).
    if (!bFase && filas.length === 0) return;
    out.push({ titulo: f.nombre, barras: bFase ? [bFase] : [], filas });
  });

  return out;
}

// Vue globale : une ligne par sous-projet, montrant l'ENCHAÎNEMENT des fases
// (chaque fase = un segment coloré avec sa date de démarrage et sa durée).
function seccionGlobal(subs: Snapshot["subproyectos"], d: Snapshot): Seccion {
  return {
    titulo: "Subproyectos — enlace de fases",
    barras: [],
    filas: subs.map((s) => {
      const { sched } = armar(s.uid, s.tipologia, d);
      return { label: s.nombre, barras: barrasFases(sched) };
    }),
  };
}

// ============================================================

export function CronogramaClient() {
  const snap = useSnapshot();
  const filtros = useComponentFilters();
  const [gran, setGran] = useState<Gran>("mes");
  const [seleccion, setSeleccion] = useState<Seleccion>("global");
  // Fases repliées (titres) — par défaut tout est déplié (détails visibles).
  const [colapsadas, setColapsadas] = useState<Set<string>>(new Set());
  const alternarSeccion = (titulo: string) =>
    setColapsadas((prev) => {
      const next = new Set(prev);
      if (next.has(titulo)) next.delete(titulo);
      else next.add(titulo);
      return next;
    });

  const subproyectos = snap.status === "ready" ? snap.data.subproyectos : [];

  const secciones: Seccion[] = (() => {
    if (snap.status !== "ready") return [];
    if (seleccion === "global") return [seccionGlobal(subproyectos, snap.data)];
    const sub = subproyectos.find((s) => s.uid === seleccion);
    return seccionesSub(seleccion, sub?.tipologia ?? "", snap.data, filtros);
  })();

  const unidades = construirUnidades(gran);
  const totalW = unidades.length * CELL_W;
  const x = (ms: number) => ((ms - START) / SPAN) * totalW;

  // --- Scroll horizontal : auto-position à juin 2026, zoom ancré, drag-to-pan.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // Date au bord gauche du viewport (ms) — conservée à travers les zooms.
  const anclaMsRef = useRef<number>(VISTA_INICIO);
  // Repositionne le scroll pour aligner l'ancre sur le bord gauche.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = ((anclaMsRef.current - START) / SPAN) * totalW;
  }, [totalW]);
  const onScroll = () => {
    const el = scrollRef.current;
    if (el) anclaMsRef.current = START + (el.scrollLeft / totalW) * SPAN;
  };

  // Drag-to-pan (glisser pour faire défiler horizontalement).
  const dragRef = useRef<{ x: number; left: number } | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const onPointerDown = (e: React.PointerEvent) => {
    // Ne pas détourner les clics sur boutons/liens.
    if ((e.target as HTMLElement).closest("button, a")) return;
    const el = scrollRef.current;
    if (!el) return;
    dragRef.current = { x: e.clientX, left: el.scrollLeft };
    setArrastrando(true);
    el.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const el = scrollRef.current;
    if (!el || !dragRef.current) return;
    el.scrollLeft = dragRef.current.left - (e.clientX - dragRef.current.x);
  };
  const finDrag = (e: React.PointerEvent) => {
    const el = scrollRef.current;
    if (el && dragRef.current) el.releasePointerCapture(e.pointerId);
    dragRef.current = null;
    setArrastrando(false);
  };

  const [hoyMs, setHoyMs] = useState<number | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- init client-only (1×) anti-décalage d'hydratation
  useEffect(() => setHoyMs(Date.now()), []);
  const hoyEnRango = hoyMs != null && hoyMs >= START && hoyMs < END;

  const anios: { anio: number; left: number; width: number }[] = [];
  for (let y = ANIO_INI; y <= ANIO_FIN; y += 1) {
    const l = x(new Date(y, 0, 1).getTime());
    const r = x(new Date(y + 1, 0, 1).getTime());
    anios.push({ anio: y, left: l, width: r - l });
  }

  const segsUnidad = unidades.map((u, i) => {
    const l = x(u.start);
    const r = x(unidades[i + 1]?.start ?? END);
    return { key: u.start, left: l, width: r - l, label: u.label };
  });

  const enSemana = gran === "semana";
  const segsSemana = enSemana
    ? unidades.map((u, i) => ({
        key: u.start,
        left: x(u.start),
        width: x(unidades[i + 1]?.start ?? END) - x(u.start),
        num: isoWeek(u.start),
      }))
    : [];
  const segsMes: { key: number; left: number; width: number; label: string }[] = [];
  if (enSemana) {
    let cur: { y: number; m: number; startMs: number } | null = null;
    for (const u of unidades) {
      const d = new Date(u.start);
      if (!cur || cur.y !== d.getFullYear() || cur.m !== d.getMonth()) {
        if (cur) {
          const l = x(cur.startMs);
          segsMes.push({ key: cur.startMs, left: l, width: x(u.start) - l, label: MES_ABBR[cur.m] });
        }
        cur = { y: d.getFullYear(), m: d.getMonth(), startMs: u.start };
      }
    }
    if (cur) {
      const l = x(cur.startMs);
      segsMes.push({ key: cur.startMs, left: l, width: x(END) - l, label: MES_ABBR[cur.m] });
    }
  }
  const headH = enSemana ? 20 + 18 + 16 : 40;

  const gridStyle = {
    backgroundImage: `repeating-linear-gradient(90deg, transparent 0 ${CELL_W - 1}px, var(--border) ${CELL_W - 1}px ${CELL_W}px)`,
  };

  const activa =
    seleccion === "global"
      ? "Proyecto global"
      : subproyectos.find((s) => s.uid === seleccion)?.nombre ?? seleccion;

  // Vue compacte = toutes les fases repliées (seulement les barres de phase).
  const esSub = seleccion !== "global";
  const todasColapsadas = secciones.length > 0 && secciones.every((s) => colapsadas.has(s.titulo));
  const alternarTodas = () =>
    setColapsadas(todasColapsadas ? new Set() : new Set(secciones.map((s) => s.titulo)));

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--text)]">Cronograma</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Fechas calculadas a partir de las duraciones y enlaces (barra llena = duración; rayado =
            hasta la fecha de fin).
          </p>
        </div>
        <div
          className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--app-bg)] p-0.5"
          role="group"
          aria-label="Granularidad"
        >
          {(["semana", "mes", "trimestre"] as Gran[]).map((g) => (
            <button
              key={g}
              type="button"
              aria-pressed={gran === g}
              onClick={() => setGran(g)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors",
                gran === g
                  ? "bg-[var(--surface)] text-[var(--text)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]",
              )}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Sélecteur de feuille (global / sous-projets réels / hypothétiques désactivés). */}
      <nav aria-label="Cronograma" className="flex flex-wrap items-center gap-2">
        <SelBtn activo={seleccion === "global"} onClick={() => setSeleccion("global")}>
          Proyecto global
        </SelBtn>
        {subproyectos.map((s) => (
          <SelBtn key={s.uid} activo={seleccion === s.uid} onClick={() => setSeleccion(s.uid)}>
            {s.nombre}
          </SelBtn>
        ))}
        {SUBPROYECTOS_HIPOTETICOS.map((s) => (
          <SelBtn key={s.uid} activo={false} disabled onClick={() => {}}>
            {s.nombre}
          </SelBtn>
        ))}
      </nav>

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-[var(--text)]">{activa}</h2>
        {esSub && secciones.length > 0 && (
          <button
            type="button"
            onClick={alternarTodas}
            aria-pressed={todasColapsadas}
            className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
          >
            {todasColapsadas ? "Vista detallada" : "Vista compacta"}
          </button>
        )}
      </div>

      {/* Légende des fases (sigle + couleur) au-dessus du cronograma. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[var(--text-muted)]">
        {LEYENDA_FASES.map((code) => {
          const color = colorDeFase(code);
          const sigla = FASE_SIGLA[code] ?? "";
          const nombre = GESTION_FASES.find((f) => f.code === code)?.nombre ?? code;
          return (
            <span key={code} className="inline-flex items-center gap-1.5">
              <span
                className="inline-flex h-4 min-w-[22px] items-center justify-center rounded px-1 text-[10px] font-semibold"
                style={{ backgroundColor: color, color: textoSobre(color) }}
              >
                {sigla}
              </span>
              <span>{nombre}</span>
            </span>
          );
        })}
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finDrag}
        onPointerCancel={finDrag}
        className={cn(
          "overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)]",
          arrastrando ? "cursor-grabbing select-none" : "cursor-grab",
        )}
      >
        <div className="relative" style={{ width: LABEL_W + totalW }}>
          {hoyEnRango && hoyMs != null && (
            // z sous la colonne d'étiquettes (z-10) : quand on scrolle et que la
            // ligne « hoy » passe derrière les libellés, elle est masquée par eux
            // (au lieu de peindre par-dessus). Reste au-dessus des barres.
            <div
              className="pointer-events-none absolute bottom-0 top-0 z-[5] w-0.5 bg-[var(--accent)]"
              style={{ left: LABEL_W + x(hoyMs) }}
              aria-hidden="true"
            />
          )}
          <div className="flex border-b border-[var(--border)]">
            <div className="sticky left-0 z-10 shrink-0 bg-[var(--surface)]" style={{ width: LABEL_W }} />
            <div className="relative" style={{ width: totalW, height: headH }}>
              {anios.map((a) => (
                <div
                  key={a.anio}
                  className="absolute top-0 flex items-center justify-center border-l border-[var(--border)] text-xs font-semibold text-[var(--text)]"
                  style={{ left: a.left, width: a.width, height: 20 }}
                >
                  {a.anio}
                </div>
              ))}
              {enSemana ? (
                <>
                  {segsMes.map((m) => (
                    <div
                      key={m.key}
                      className="absolute overflow-hidden truncate border-l border-t border-[var(--border)] px-1 text-[10px] font-medium text-[var(--text-muted)]"
                      style={{ left: m.left, width: m.width, top: 20, height: 18, lineHeight: "18px" }}
                    >
                      {m.width > 16 ? m.label : ""}
                    </div>
                  ))}
                  {segsSemana.map((w) => (
                    <div
                      key={w.key}
                      className="absolute overflow-hidden border-l border-t border-[var(--border)] text-center text-[9px] text-[var(--text-muted)]"
                      style={{ left: w.left, width: w.width, top: 38, height: 16, lineHeight: "16px" }}
                    >
                      {w.width >= 11 ? w.num : ""}
                    </div>
                  ))}
                </>
              ) : (
                segsUnidad.map((u) => (
                  <div
                    key={u.key}
                    className="absolute border-l border-t border-[var(--border)] text-center text-[10px] font-medium text-[var(--text-muted)]"
                    style={{ left: u.left, width: u.width, top: 20, height: 20, lineHeight: "20px" }}
                  >
                    {u.label}
                  </div>
                ))
              )}
            </div>
          </div>

          {secciones.map((sec) => {
            const colapsada = colapsadas.has(sec.titulo);
            const plegable = sec.filas.length > 0;
            return (
              <div key={sec.titulo}>
                {/* Ligne du TITRE : bande grise + barre de la fase + collapse. */}
                <div className="flex border-b border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => plegable && alternarSeccion(sec.titulo)}
                    disabled={!plegable}
                    aria-expanded={plegable ? !colapsada : undefined}
                    className={cn(
                      "sticky left-0 z-10 flex shrink-0 items-center gap-1.5 border-r border-[var(--border)] px-2 text-left text-sm font-semibold text-[var(--text)]",
                      plegable && "cursor-pointer hover:bg-[#e2e5ea]",
                    )}
                    style={{ width: LABEL_W, height: ROW_H, backgroundColor: "#eceef2" }}
                    title={sec.titulo}
                  >
                    {plegable && <Chevron abierto={!colapsada} />}
                    <span className="truncate">{sec.titulo}</span>
                  </button>
                  <div
                    className="relative"
                    style={{ width: totalW, height: ROW_H, backgroundColor: "#eceef2" }}
                  >
                    <CapaBarras barras={sec.barras} x={x} />
                  </div>
                </div>
                {!colapsada &&
                  sec.filas.map((fila, fi) => (
                    <div key={fi} className="flex border-b border-[var(--border)] last:border-b-0">
                      <div
                        className="sticky left-0 z-10 flex shrink-0 items-center truncate border-r border-[var(--border)] bg-[var(--surface)] pl-6 pr-3 text-xs font-semibold text-[var(--text)]"
                        style={{ width: LABEL_W, height: ROW_H }}
                        title={fila.label}
                      >
                        {fila.label}
                      </div>
                      <div className="relative" style={{ width: totalW, height: ROW_H, ...gridStyle }}>
                        <CapaBarras barras={fila.barras} x={x} />
                      </div>
                    </div>
                  ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Chevron de collapse (pivote : bas = ouvert, droite = replié).
function Chevron({ abierto }: { abierto: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="shrink-0 transition-transform"
      style={{ transform: abierto ? "rotate(90deg)" : "none" }}
    >
      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Couche des barres d'une ligne (barre pleine + hachures + étiquette).
function CapaBarras({ barras, x }: { barras: Barra[]; x: (ms: number) => number }) {
  return (
    <>
      {barras.map((b, bi) => {
        const left = x(b.startMs);
        const rPlena = x(b.solidMs);
        const rFin = x(b.endMs);
        return (
          <div key={bi}>
            <div
              className={cn("absolute", b.endMs > b.solidMs ? "rounded-l" : "rounded")}
              style={{ left, width: Math.max(2, rPlena - left), top: 0, height: ROW_H, backgroundColor: b.color }}
              title={b.tooltip}
            />
            {b.endMs > b.solidMs ? (
              <div
                className="absolute rounded-r"
                title={b.tooltip}
                style={{
                  left: rPlena,
                  width: rFin - rPlena,
                  top: 0,
                  height: ROW_H,
                  backgroundImage: `repeating-linear-gradient(45deg, ${b.color} 0 5px, #fff 5px 10px)`,
                }}
              />
            ) : null}
            {b.etiqueta && b.dentro ? (
              <span
                className="pointer-events-none absolute block truncate px-1 text-[10px] font-medium"
                style={{
                  left,
                  width: Math.max(0, rPlena - left),
                  top: 0,
                  height: ROW_H,
                  lineHeight: `${ROW_H}px`,
                  color: b.etiquetaColor ?? "#1f2733",
                }}
                title={b.etiqueta}
              >
                {b.etiqueta}
              </span>
            ) : b.etiqueta ? (
              <span
                className="pointer-events-none absolute whitespace-nowrap text-[11px] leading-none text-[var(--text)]"
                style={{ left: rFin + 4, top: ROW_H / 2 - 5 }}
              >
                {b.etiqueta}
              </span>
            ) : null}
          </div>
        );
      })}
    </>
  );
}

function SelBtn({
  activo,
  onClick,
  children,
  disabled = false,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={activo}
      title={disabled ? "Subproyecto hipotético — por definir" : undefined}
      className={cn(
        "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]",
        disabled
          ? "cursor-not-allowed border border-dashed border-[var(--border)] bg-[var(--app-bg)] italic text-[var(--text-muted)] opacity-60"
          : activo
            ? "bg-[var(--text)] text-white"
            : "border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--text-muted)] hover:text-[var(--text)]",
      )}
    >
      {children}
    </button>
  );
}
