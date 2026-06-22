"use client";

import { useState } from "react";
import type { SnapshotEvento } from "@/lib/snapshot";
import { cn } from "@/lib/cn";
import { useSnapshot } from "@/components/dashboard/use-snapshot";
import { MonthGrid } from "./month-grid";
import { EventoModal } from "./evento-modal";
import { MESES, offsetLabel, hoyStr, type Zona } from "./fechas";

const ZONA_KEY = "peebcoolsf:calendario:zona";

const ZONAS: { code: Zona; label: string }[] = [
  { code: "AR", label: "Argentina" },
  { code: "FR", label: "Francia" },
];

/**
 * Calendario (CDC §4.3) — vue mensuelle de tous les eventos du projet.
 * Lecture via /api/snapshot (hook useSnapshot, comme DashboardClient).
 * Les horaires sont saisis en heure d'Argentine ; le sélecteur permet de les
 * afficher en heure de France (cf. components/calendario/fechas.ts).
 */
export function CalendarioClient() {
  const snap = useSnapshot();

  // Mois affiché (month 0-based). Init sur le mois courant (local).
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });

  // Événement sélectionné (modal de détail).
  const [sel, setSel] = useState<SnapshotEvento | null>(null);

  // Zone d'affichage des horaires (défaut Argentine, mémorisée dans localStorage).
  // Initialiseur paresseux avec garde SSR : `localStorage` n'existe pas côté serveur.
  const [zona, setZona] = useState<Zona>(() => {
    if (typeof window === "undefined") return "AR";
    const z = window.localStorage.getItem(ZONA_KEY);
    return z === "AR" || z === "FR" ? z : "AR";
  });
  const cambiarZona = (z: Zona) => {
    setZona(z);
    window.localStorage.setItem(ZONA_KEY, z);
  };

  const irMes = (delta: number) =>
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  const irHoy = () => {
    const n = new Date();
    setCursor({ year: n.getFullYear(), month: n.getMonth() });
  };

  // Pendant le chargement (= rendu serveur), on n'affiche RIEN qui dépende de
  // `new Date()` (mois courant, jour surligné) : l'en-tête et la grille ne sont
  // rendus que côté client une fois le snapshot prêt → pas de décalage d'hydratation.
  if (snap.status === "loading") {
    return (
      <div className="mx-auto max-w-6xl">
        <p className="py-16 text-center text-sm text-[var(--text-muted)]">Cargando…</p>
      </div>
    );
  }

  const error = snap.status === "error";

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      {/* Barre supérieure : navigation mois + sélecteur de fuseau */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => irMes(-1)}
            aria-label="Mes anterior"
            className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-[var(--app-bg)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => irMes(1)}
            aria-label="Mes siguiente"
            className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-[var(--app-bg)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
          >
            ›
          </button>
          <h1 className="ml-1 min-w-[10rem] text-lg font-semibold tracking-tight text-[var(--text)]">
            {MESES[cursor.month]} {cursor.year}
          </h1>
          <button
            type="button"
            onClick={irHoy}
            className="ml-1 rounded-md border border-[var(--border)] px-3 py-1 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--app-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
          >
            Hoy
          </button>
        </div>

        {/* Fuseau des horaires affichés */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-[var(--text-muted)]">Horarios en</span>
          <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--app-bg)] p-0.5">
            {ZONAS.map((z) => {
              const on = zona === z.code;
              return (
                <button
                  key={z.code}
                  type="button"
                  aria-pressed={on}
                  onClick={() => cambiarZona(z.code)}
                  className={cn(
                    "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                    on
                      ? "bg-[var(--surface)] text-[var(--text)] shadow-sm"
                      : "text-[var(--text-muted)] hover:text-[var(--text)]",
                  )}
                >
                  {z.label}{" "}
                  <span className={cn("text-xs", on ? "text-[var(--text-muted)]" : "opacity-70")}>
                    ({offsetLabel(z.code, cursor.year, cursor.month)})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grille */}
      {error ? (
        <p className="py-16 text-center text-sm text-[var(--text-muted)]">
          No se pudo cargar el calendario.
        </p>
      ) : (
        <MonthGrid
          year={cursor.year}
          month={cursor.month}
          eventos={snap.status === "ready" ? snap.data.eventos : []}
          hoy={hoyStr()}
          zona={zona}
          onSelect={setSel}
        />
      )}

      {sel && <EventoModal evento={sel} zona={zona} onClose={() => setSel(null)} />}
    </div>
  );
}
