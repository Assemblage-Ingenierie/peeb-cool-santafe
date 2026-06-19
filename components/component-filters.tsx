"use client";

import { COMPONENTES } from "@/lib/constants";
import { cn } from "@/lib/cn";

interface ComponentFiltersProps {
  selected: Set<string>;
  onToggle: (code: string) => void;
}

/**
 * Filtres par composante (CDC §2.1) : libellé « Filtrar » + 4 boutons GP/EE/AyS/G.
 * Persistants dans le header sur toutes les pages. État actif/inactif uniquement —
 * l'effet du filtre sur le contenu sera implémenté plus tard.
 * Actif = rempli de la couleur composante ; inactif = neutre + pastille de couleur.
 */
export function ComponentFilters({ selected, onToggle }: ComponentFiltersProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs font-medium uppercase tracking-wide text-[var(--text-muted)] sm:inline">
        Filtrar
      </span>
      <div
        className="flex flex-wrap items-center gap-1"
        role="group"
        aria-label="Filtrar por componente"
      >
        {COMPONENTES.map((c) => {
          const on = selected.has(c.code);
          return (
            <button
              key={c.code}
              type="button"
              aria-pressed={on}
              title={c.nombre}
              onClick={() => onToggle(c.code)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                !on &&
                  "border border-[var(--border)] bg-[var(--app-bg)] text-[var(--text-muted)] hover:text-[var(--text)]",
              )}
              style={on ? { backgroundColor: c.color, color: c.onColor } : undefined}
            >
              {!on && (
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: c.color }}
                  aria-hidden="true"
                />
              )}
              {c.code}
            </button>
          );
        })}
      </div>
    </div>
  );
}
