"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { FASES } from "@/lib/constants";
import { useSnapshot } from "@/components/dashboard/use-snapshot";

// ============================================================
// Hojas de ruta (nouvelle page) — sous-lot 1 : navigation entre les feuilles de
// route (proyecto global + un sous-projet) et structure verticale des phases.
// Le contenu des phases (cartes de tâches, dépendances) viendra dans les sous-lots
// suivants. Lecture publique via /api/snapshot (comme le reste).
// ============================================================

// Fases chronologiques de la feuille de route = toutes les fases SAUF « General »
// (transversale, hors séquence). Libellés/ordre = source unique lib/constants (FASES).
const FASES_ROADMAP = FASES.filter((f) => f.code !== "general");

// Feuille de route affichée : projet global ou un sous-projet (par UID).
type Seleccion = "global" | string;

export function HojasDeRutaClient() {
  const snap = useSnapshot();
  const [seleccion, setSeleccion] = useState<Seleccion>("global");

  const subproyectos = snap.status === "ready" ? snap.data.subproyectos : [];

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
          {FASES_ROADMAP.map((fase, i) => (
            <div key={fase.code} className="flex gap-4 p-4">
              <div className="w-28 shrink-0 sm:w-44">
                <div className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                  Fase {String(i + 1).padStart(2, "0")}
                </div>
                <div className="mt-0.5 text-sm font-semibold leading-snug text-[var(--text)]">
                  {fase.nombre}
                </div>
              </div>
              {/* Zone de contenu de la phase — vide pour l'instant (cartes à venir). */}
              <div className="min-h-[72px] flex-1 rounded-md bg-[var(--app-bg)]" aria-hidden="true" />
            </div>
          ))}
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
