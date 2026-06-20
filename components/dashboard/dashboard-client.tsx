"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { useSnapshot } from "./use-snapshot";
import { Agenda } from "./agenda";
import { SeguimientoPanel } from "./seguimiento-panel";

type GestionMode = "global" | "subproyectos";

const GESTION_TABS: { key: GestionMode; label: string }[] = [
  { key: "global", label: "Proyecto global" },
  { key: "subproyectos", label: "Subproyectos" },
];

// Largeur partagée de la colonne de libellés à gauche (Agenda / Gestión).
const LABEL_COL = "w-24 shrink-0 pt-1 sm:w-28";

/** Inicio (Dashboard) — CDC §4.1 / capture V2. */
export function DashboardClient() {
  const snap = useSnapshot();
  const [mode, setMode] = useState<GestionMode>("global");
  const [tipo, setTipo] = useState<string>("todos");
  const [selected, setSelected] = useState<string | null>(null);

  const loading = snap.status === "loading";
  const error = snap.status === "error" ? snap.message : null;
  const expanded = mode === "subproyectos";

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      {/* Agenda — toujours visible */}
      <Agenda
        eventos={snap.status === "ready" ? snap.data.eventos : []}
        loading={loading}
        error={error}
        labelClassName={LABEL_COL}
      />

      {/* Gestión : projet global (par défaut) ou subproyectos */}
      <section className="flex items-start gap-4">
        <span className={cn(LABEL_COL, "text-base font-semibold text-[var(--text)]")}>Gestión</span>
        <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--app-bg)] p-0.5">
          {GESTION_TABS.map((t) => {
            const on = mode === t.key;
            return (
              <button
                key={t.key}
                type="button"
                aria-pressed={on}
                onClick={() => setMode(t.key)}
                className={cn(
                  "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                  on
                    ? "bg-[var(--surface)] text-[var(--text)] shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text)]",
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Panneau central — déplié uniquement en mode « Subproyectos » */}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden" inert={!expanded}>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            {error ? (
              <p className="py-8 text-center text-sm text-[var(--text-muted)]">
                No se pudieron cargar los datos.
              </p>
            ) : loading ? (
              <p className="py-8 text-center text-sm text-[var(--text-muted)]">Cargando…</p>
            ) : (
              <SeguimientoPanel
                subproyectos={snap.status === "ready" ? snap.data.subproyectos : []}
                expanded={expanded}
                tipo={tipo}
                onTipo={setTipo}
                selected={selected}
                onSelect={(uid) => setSelected((cur) => (cur === uid ? null : uid))}
              />
            )}
          </div>
        </div>
      </div>

      {/* Bande du bas — emplacements réservés (neutres), pour les deux modes */}
      <BottomBand />
    </div>
  );
}

function BottomBand() {
  const blocks = ["Datos", "Documentos", "Progreso"];
  return (
    <section className="grid gap-4 sm:grid-cols-3">
      {blocks.map((b) => (
        <div key={b} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="text-sm font-semibold text-[var(--text)]">{b}</h2>
          <div className="mt-3 flex h-28 items-center justify-center rounded-md border border-dashed border-[var(--border)] text-xs text-[var(--text-muted)]">
            Por definir
          </div>
        </div>
      ))}
    </section>
  );
}
