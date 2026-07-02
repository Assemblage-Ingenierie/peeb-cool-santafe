"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { getComponente, type ComponenteCode } from "@/lib/constants";
import { useSnapshot } from "@/components/dashboard/use-snapshot";
import { useComponentFilters } from "@/components/filter-context";

// ============================================================
// Cronograma (Gantt) — CDC. PROTOTYPE : dates/durées INVENTÉES pour travailler
// le rendu (barres par composante, excédent hachuré, fases en bleus progressifs).
// La vue réagit à « Vista / Rol » (filtre header) et au sélecteur de sous-projet.
// Granularité de l'axe : semana / mes / trimestre.
// ============================================================

type Gran = "semana" | "mes" | "trimestre";
type Seleccion = "global" | string;

// Fenêtre temporelle du projet (inventée) : 2026 → 2030 inclus.
const ANIO_INI = 2026;
const ANIO_FIN = 2030;
const START = new Date(ANIO_INI, 0, 1).getTime();
const END = new Date(ANIO_FIN + 1, 0, 1).getTime();
const SPAN = END - START;

const LABEL_W = 240; // largeur de la colonne de libellés (gelée)
const ROW_H = 26;

const UNIT_W: Record<Gran, number> = { semana: 12, mes: 26, trimestre: 66 };
const MES_ABBR = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// Bleus progressifs pour les fases (clair → foncé).
const BLUES = ["#cfe2f3", "#9fc5e8", "#6fa8dc", "#3d85c6", "#0b5394", "#073763"];
// Gris (pliegos / licitación) + rouge (obras) pour les segments d'obra.
const GRIS_CLARO = "#d9d9d9";
const GRIS = "#999999";

interface Unidad {
  start: number; // ms
  label: string;
  anio: number;
}

function construirUnidades(gran: Gran): Unidad[] {
  const out: Unidad[] = [];
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

// --- Modèle du Gantt --------------------------------------------------------

interface Barra {
  desde: number; // index de trimestre (0 = 2026 T1)
  plena: number; // nombre de trimestres pleins
  extra?: number; // trimestres supplémentaires (hachurés) jusqu'à fecha fin
  color: string;
  etiqueta?: string;
}
interface Fila {
  label: string;
  bold?: boolean;
  barras: Barra[];
}
interface Seccion {
  titulo: string;
  filas: Fila[];
}

// Index de trimestre (0..19) → ms du début de ce trimestre.
function qMs(qi: number): number {
  const y = ANIO_INI + Math.floor(qi / 4);
  const q = qi % 4;
  return new Date(y, q * 3, 1).getTime();
}

// ============================================================
// Données INVENTÉES (prototype). Reproduisent l'esprit de l'exemple.
// ============================================================
const G = "G" as ComponenteCode;
const EE = "EE" as ComponenteCode;
const AyS = "AyS" as ComponenteCode;
const GP = "GP" as ComponenteCode;

function colorComp(c: ComponenteCode): string {
  return getComponente(c)?.color ?? "#ccc";
}

// Sections « activités » par composante (feuille de route générale, inventé).
const ACTIVIDADES: { comp: ComponenteCode; titulo: string; filas: Fila[] }[] = [
  {
    comp: GP,
    titulo: "Gestión de proyecto",
    filas: [
      { label: "Elaboración del plan de comunicaciones", barras: [{ desde: 1, plena: 2, color: colorComp(GP), etiqueta: "Elaboración del plan de comunicaciones" }] },
      { label: "Auditorías del proyecto", barras: [{ desde: 9, plena: 1, color: colorComp(GP), etiqueta: "Auditorías" }, { desde: 17, plena: 1, color: colorComp(GP), etiqueta: "Auditorías" }] },
      { label: "Evaluación final del proyecto", barras: [{ desde: 19, plena: 1, color: colorComp(GP), etiqueta: "Evaluación" }] },
    ],
  },
  {
    comp: EE,
    titulo: "Eficiencia energética",
    filas: [
      { label: "Auditorías energéticas", barras: [{ desde: 2, plena: 3, color: colorComp(EE), etiqueta: "Auditorías energéticas" }] },
      { label: "Comprobación del indicador PEEB Cool", barras: [{ desde: 5, plena: 2, extra: 2, color: colorComp(EE), etiqueta: "Comprobación PEEB Cool" }] },
    ],
  },
  {
    comp: AyS,
    titulo: "Ambiental y social",
    filas: [
      { label: "Estudios de asbestos", barras: [{ desde: 2, plena: 1, color: colorComp(AyS), etiqueta: "Estudios de asbestos" }] },
      { label: "Plan de gestión de desechos", barras: [{ desde: 3, plena: 1, color: colorComp(AyS), etiqueta: "Plan de gestión de desechos" }] },
      { label: "Gestión AyS por la ACEFE", barras: [{ desde: 2, plena: 4, extra: 12, color: colorComp(AyS), etiqueta: "Gestión AyS por la ACEFE" }] },
    ],
  },
  {
    comp: G,
    titulo: "Género",
    filas: [
      { label: "Diagnóstico de género", barras: [{ desde: 4, plena: 3, color: colorComp(G), etiqueta: "Diagnóstico de género" }] },
      { label: "Capacitaciones en temáticas de género", barras: [{ desde: 3, plena: 2, color: colorComp(G), etiqueta: "Capacitaciones de género" }] },
      { label: "Revisión de pliegos", barras: [{ desde: 6, plena: 1, color: colorComp(G), etiqueta: "Revisión de pliegos" }] },
    ],
  },
];

// Section « une ligne par sous-projet » : fases en bleus progressifs (inventé).
function seccionSubproyectos(nombres: string[]): Seccion {
  const FASES_DEMO = [
    { plena: 2 },
    { plena: 2 },
    { plena: 2 },
    { plena: 3 },
    { plena: 4 },
  ];
  return {
    titulo: "Sub­proyectos — fases",
    filas: nombres.map((nombre, i) => {
      let cursor = 1 + (i % 3); // décalage inventé par sous-projet
      const barras: Barra[] = FASES_DEMO.map((f, j) => {
        const b: Barra = { desde: cursor, plena: f.plena, color: BLUES[j % BLUES.length] };
        cursor += f.plena;
        return b;
      });
      return { label: nombre, barras };
    }),
  };
}

// Section d'obras : segments Pliegos │ Licitación │ Obras (gris/gris/rouge).
const SECCION_OBRAS: Seccion = {
  titulo: "Obras de renovación",
  filas: [
    {
      label: "Obras de aeropuertos",
      barras: [
        { desde: 5, plena: 1, color: GRIS_CLARO, etiqueta: "Pliegos" },
        { desde: 6, plena: 1, color: GRIS, etiqueta: "Licitación" },
        { desde: 7, plena: 3, extra: 4, color: "#e69999", etiqueta: "Obras" },
      ],
    },
    {
      label: "Obras de hospitales",
      barras: [
        { desde: 7, plena: 1, color: GRIS_CLARO, etiqueta: "Pliegos" },
        { desde: 8, plena: 1, color: GRIS, etiqueta: "Licitación" },
        { desde: 9, plena: 4, extra: 6, color: "#e06666", etiqueta: "Obras" },
      ],
    },
  ],
};

// ============================================================

export function CronogramaClient() {
  const snap = useSnapshot();
  const filtros = useComponentFilters();
  const [gran, setGran] = useState<Gran>("trimestre");
  const [seleccion, setSeleccion] = useState<Seleccion>("global");

  const subproyectos = snap.status === "ready" ? snap.data.subproyectos : [];
  const esTodo = filtros.size >= 4;
  const compSel = filtros.size === 1 ? ([...filtros][0] as ComponenteCode) : null;

  // Sections selon Vista/Rol + sélecteur. PROTOTYPE : données inventées.
  const secciones: Seccion[] = (() => {
    // Filtrer les sections d'activités selon la composante active (ou toutes).
    const acts = ACTIVIDADES.filter((a) => esTodo || a.comp === compSel);
    const out: Seccion[] = acts.map((a) => ({ titulo: a.titulo, filas: a.filas }));
    if (seleccion === "global") {
      out.push(SECCION_OBRAS);
      out.push(
        seccionSubproyectos(
          subproyectos.length > 0 ? subproyectos.map((s) => s.nombre) : ["Sub­proyecto 1", "Sub­proyecto 2"],
        ),
      );
    }
    return out;
  })();

  const unidades = construirUnidades(gran);
  const totalW = unidades.length * UNIT_W[gran];
  const x = (ms: number) => ((ms - START) / SPAN) * totalW;

  // Groupes d'années (en-tête supérieur).
  const anios: { anio: number; left: number; width: number }[] = [];
  for (let y = ANIO_INI; y <= ANIO_FIN; y += 1) {
    const l = x(new Date(y, 0, 1).getTime());
    const r = x(new Date(y + 1, 0, 1).getTime());
    anios.push({ anio: y, left: l, width: r - l });
  }

  const gridStyle = {
    backgroundImage: `repeating-linear-gradient(90deg, transparent 0 ${UNIT_W[gran] - 1}px, var(--border) ${UNIT_W[gran] - 1}px ${UNIT_W[gran]}px)`,
  };

  const activa =
    seleccion === "global"
      ? "Proyecto global"
      : subproyectos.find((s) => s.uid === seleccion)?.nombre ?? seleccion;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--text)]">Cronograma</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Vista: <span className="font-medium text-[var(--text)]">{esTodo ? "Todo (GP)" : compSel}</span> · datos de
            ejemplo (fechas y duración inventadas).
          </p>
        </div>
        {/* Granularité */}
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

      {/* Sélecteur de feuille (global / sous-projets) — masqué en vue composante. */}
      {esTodo && (
        <nav aria-label="Cronograma" className="flex flex-wrap items-center gap-2">
          <SelBtn activo={seleccion === "global"} onClick={() => setSeleccion("global")}>
            Proyecto global
          </SelBtn>
          {subproyectos.map((s) => (
            <SelBtn key={s.uid} activo={seleccion === s.uid} onClick={() => setSeleccion(s.uid)}>
              {s.nombre}
            </SelBtn>
          ))}
        </nav>
      )}

      <h2 className="text-base font-semibold text-[var(--text)]">{activa}</h2>

      {/* Gantt */}
      <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <div style={{ width: LABEL_W + totalW }}>
          {/* En-tête : années + unités */}
          <div className="flex border-b border-[var(--border)]">
            <div className="sticky left-0 z-10 shrink-0 bg-[var(--surface)]" style={{ width: LABEL_W }} />
            <div className="relative" style={{ width: totalW, height: 40 }}>
              {anios.map((a) => (
                <div
                  key={a.anio}
                  className="absolute top-0 border-l border-[var(--border)] text-center text-xs font-semibold text-[var(--text)]"
                  style={{ left: a.left, width: a.width }}
                >
                  <div className="py-1">{a.anio}</div>
                  <div className="flex border-t border-[var(--border)] text-[10px] font-medium text-[var(--text-muted)]">
                    {unidades
                      .filter((u) => u.anio === a.anio)
                      .map((u) => (
                        <div key={u.start} className="flex-1 border-l border-[var(--border)] first:border-l-0">
                          {u.label}
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sections + filas */}
          {secciones.map((sec) => (
            <div key={sec.titulo}>
              {/* En-tête de section (bandeau noir) */}
              <div className="flex">
                <div
                  className="sticky left-0 z-10 shrink-0 truncate px-3 py-1.5 text-xs font-semibold text-white"
                  style={{ width: LABEL_W, backgroundColor: "#111318" }}
                >
                  {sec.titulo}
                </div>
                <div style={{ width: totalW, backgroundColor: "#111318" }} />
              </div>
              {sec.filas.map((fila, fi) => (
                <div key={fi} className="flex border-b border-[var(--border)] last:border-b-0">
                  <div
                    className={cn(
                      "sticky left-0 z-10 flex shrink-0 items-center truncate border-r border-[var(--border)] bg-[var(--surface)] px-3 text-[11px] text-[var(--text)]",
                      fila.bold && "font-semibold",
                    )}
                    style={{ width: LABEL_W, height: ROW_H }}
                    title={fila.label}
                  >
                    {fila.label}
                  </div>
                  <div className="relative" style={{ width: totalW, height: ROW_H, ...gridStyle }}>
                    {fila.barras.map((b, bi) => {
                      const left = x(qMs(b.desde));
                      const rPlena = x(qMs(b.desde + b.plena));
                      const rFin = x(qMs(b.desde + b.plena + (b.extra ?? 0)));
                      return (
                        <div key={bi}>
                          <div
                            className="absolute rounded-sm"
                            style={{ left, width: rPlena - left, top: 5, height: ROW_H - 10, backgroundColor: b.color }}
                          />
                          {b.extra ? (
                            <div
                              className="absolute rounded-sm"
                              style={{
                                left: rPlena,
                                width: rFin - rPlena,
                                top: 5,
                                height: ROW_H - 10,
                                backgroundImage: `repeating-linear-gradient(45deg, ${b.color} 0 5px, #fff 5px 10px)`,
                              }}
                            />
                          ) : null}
                          {b.etiqueta ? (
                            <span
                              className="pointer-events-none absolute whitespace-nowrap text-[11px] leading-none text-[var(--text)]"
                              style={{ left: left + 4, top: ROW_H / 2 - 5 }}
                            >
                              {b.etiqueta}
                            </span>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SelBtn({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={cn(
        "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]",
        activo
          ? "bg-[var(--text)] text-white"
          : "border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--text-muted)] hover:text-[var(--text)]",
      )}
    >
      {children}
    </button>
  );
}
