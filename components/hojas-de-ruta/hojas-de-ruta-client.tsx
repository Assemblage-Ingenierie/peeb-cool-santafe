"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import {
  FASES,
  ROADMAP_AYS,
  CARD_TONOS,
  RESPONSABLE_DEFECTO,
  REQUISITOS_AYS,
  REQUISITOS_AYS_CODES,
  type RoadmapTarea,
} from "@/lib/constants";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { CheckIcon } from "@/components/icons";
import { useSnapshot } from "@/components/dashboard/use-snapshot";

// ============================================================
// Hojas de ruta (nouvelle page) — sous-lot 1 : navigation entre les feuilles de
// route (proyecto global + un sous-projet) et structure verticale des phases.
// Le contenu des phases (cartes de tâches, dépendances) viendra dans les sous-lots
// suivants. Lecture publique via /api/snapshot (comme le reste).
// ============================================================

// Séquence de la feuille de route = toutes les fases SAUF « General » (transversale,
// hors séquence). Libellés/ordre = source unique lib/constants (FASES).
// « No objeción AFD » n'est PAS une phase numérotée : c'est un jalon (un espace
// réservé) entre « Redacción de pliegos » et « Licitación ». Seules les vraies
// phases sont numérotées 01..N.
const HITO_AFD = "no_objecion_afd";

interface FilaRuta {
  code: string;
  nombre: string;
  hito: boolean;
  numero: number | null;
}

const FILAS_RUTA: FilaRuta[] = [];
{
  let numero = 0;
  for (const f of FASES.filter((x) => x.code !== "general")) {
    const hito = f.code === HITO_AFD;
    if (!hito) numero += 1;
    FILAS_RUTA.push({ code: f.code, nombre: f.nombre, hito, numero: hito ? null : numero });
  }
}

// Résolution des libellés de Requisitos AyS (code § → label) pour les cartes
// « dinámicas » (« planes » à adapter selon ce qui est coché en Admin).
const REQ_LABEL = new Map<string, string>(
  REQUISITOS_AYS.flatMap((g) => g.requisitos.map((r) => [r.code, r.label] as const)),
);

// Feuille de route affichée : projet global ou un sous-projet (par UID).
type Seleccion = "global" | string;

export function HojasDeRutaClient() {
  const snap = useSnapshot();
  const [seleccion, setSeleccion] = useState<Seleccion>("global");
  const admin = isAdmin(getCurrentUser());

  // No objeción AFD (jalon) : case admin « recibida », par feuille de route.
  // État local pour l'instant — persistance en base avec le stockage des tâches.
  const [anoAfd, setAnoAfd] = useState<Record<string, boolean>>({});
  const anoChecked = !!anoAfd[seleccion];

  const subproyectos = snap.status === "ready" ? snap.data.subproyectos : [];
  const aysRequisitos = snap.status === "ready" ? snap.data.aysRequisitos : [];

  // Requisitos AyS cochés du sous-projet (libellés, ordre stable) — alimentent les
  // tâches « dinámicas » (« planes » à adapter selon ce qui est coché en Admin).
  function requisitosDe(uid: string): string[] {
    const checked = new Set(
      aysRequisitos.filter((r) => r.subproyectoUid === uid).map((r) => r.requisito),
    );
    return REQUISITOS_AYS_CODES.filter((c) => checked.has(c)).map((c) => REQ_LABEL.get(c) ?? c);
  }

  // Libellé de la feuille de route active (titre de section).
  const activa =
    seleccion === "global"
      ? "Proyecto global"
      : subproyectos.find((s) => s.uid === seleccion)?.nombre ?? seleccion;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[var(--text)]">
          Hojas de ruta
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Hoja de ruta del proyecto global y de cada subproyecto.
        </p>
      </div>

      {/* Navegación entre hojas de ruta */}
      <nav aria-label="Hojas de ruta" className="flex flex-wrap items-center gap-2">
        <RutaButton activo={seleccion === "global"} onClick={() => setSeleccion("global")}>
          Proyecto global
        </RutaButton>
        {subproyectos.map((s) => (
          <RutaButton
            key={s.uid}
            activo={seleccion === s.uid}
            onClick={() => setSeleccion(s.uid)}
          >
            {s.nombre}
          </RutaButton>
        ))}
        {snap.status === "loading" && (
          <span className="self-center text-sm text-[var(--text-muted)]">
            Cargando subproyectos…
          </span>
        )}
        {snap.status === "error" && (
          <span className="self-center text-sm text-[var(--text-muted)]">
            No se pudieron cargar los subproyectos.
          </span>
        )}
      </nav>

      {/* Hoja de ruta activa */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-[var(--text)]">{activa}</h2>

        {/* Estructura vertical de las fases del proyecto */}
        <div className="divide-y divide-[var(--border)] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          {FILAS_RUTA.map((fila) =>
            fila.hito ? (
              // Jalon « No objeción AFD » : espace réservé non numéroté entre
              // « Redacción de pliegos » et « Licitación ». Case admin « recibida »
              // (rouge) à droite ; une fois cochée, le libellé passe en bleu.
              <div
                key={fila.code}
                className="relative flex items-center justify-center gap-3 bg-[var(--app-bg)] px-12 py-3"
              >
                <span className="h-px w-8 bg-[var(--border)]" aria-hidden="true" />
                <span
                  className={cn(
                    "text-xs font-semibold uppercase tracking-wide transition-colors",
                    anoChecked ? "text-[var(--focus)]" : "text-[var(--text-muted)]",
                  )}
                >
                  {fila.nombre}
                </span>
                <span className="h-px w-8 bg-[var(--border)]" aria-hidden="true" />
                {admin && (
                  <button
                    type="button"
                    onClick={() => setAnoAfd((p) => ({ ...p, [seleccion]: !p[seleccion] }))}
                    aria-pressed={anoChecked}
                    aria-label="No objeción AFD recibida"
                    title="No objeción AFD recibida"
                    className={cn(
                      "absolute right-4 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded border-2 border-[var(--accent)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]",
                      anoChecked
                        ? "bg-[var(--accent)] text-white"
                        : "bg-transparent text-transparent hover:text-[var(--accent)]",
                    )}
                  >
                    <CheckIcon className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <div key={fila.code} className="flex items-center gap-4 p-4">
                {/* Cartes de la fase (partie AyS pour l'instant) — à gauche. */}
                <div className="flex flex-1 flex-wrap content-start gap-2.5">
                  {ROADMAP_AYS.filter((t) => t.fase === fila.code).map((tarea, idx) => (
                    <TareaCard
                      key={`${fila.code}-${idx}`}
                      tarea={tarea}
                      esGlobal={seleccion === "global"}
                      requisitos={
                        tarea.dinamica && seleccion !== "global" ? requisitosDe(seleccion) : null
                      }
                    />
                  ))}
                </div>
                {/* Libellé de la fase — à droite. */}
                <div className="w-28 shrink-0 self-center sm:w-44">
                  <div className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                    Fase {String(fila.numero).padStart(2, "0")}
                  </div>
                  <div className="mt-0.5 text-sm font-semibold leading-snug text-[var(--text)]">
                    {fila.nombre}
                  </div>
                </div>
              </div>
            ),
          )}
        </div>
      </section>
    </div>
  );
}

function RutaButton({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: ReactNode;
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

// Carte de tâche de la feuille de route. Style sobre par composante (CARD_TONOS).
// Les tâches « dinámicas » listent les Requisitos AyS cochés du sous-projet
// (ou une note au niveau « Proyecto global »). Responsable par défaut = ACEFE.
function TareaCard({
  tarea,
  requisitos,
  esGlobal,
}: {
  tarea: RoadmapTarea;
  requisitos: string[] | null;
  esGlobal: boolean;
}) {
  const tono = CARD_TONOS[tarea.componente];
  return (
    <div
      className="flex w-[232px] flex-col overflow-hidden rounded-md border"
      style={{ backgroundColor: tono.bg, borderColor: tono.border }}
    >
      <div
        className="px-3 pb-1.5 pt-2 text-center text-[12.5px] font-semibold leading-snug"
        style={{ color: tono.texto }}
      >
        {tarea.nombre}
      </div>

      {tarea.dinamica && (
        <div className="px-3 pb-1 text-[11px] leading-snug" style={{ color: tono.texto }}>
          {esGlobal ? (
            <p className="text-center italic opacity-75">
              Según los requisitos AyS de cada subproyecto
            </p>
          ) : requisitos && requisitos.length > 0 ? (
            <ul className="list-disc space-y-0.5 pl-4">
              {requisitos.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          ) : (
            <p className="text-center italic opacity-60">Sin requisitos AyS marcados</p>
          )}
        </div>
      )}

      <div
        className="mt-auto px-3 pb-2 pt-1 text-center text-[11px] opacity-75"
        style={{ color: tono.texto }}
      >
        {RESPONSABLE_DEFECTO}
      </div>
    </div>
  );
}
