"use client";

import { COMPONENTES } from "@/lib/constants";
import { cn } from "@/lib/cn";

interface ComponentFiltersProps {
  selected: Set<string>;
  onToggle: (code: string) => void;
}

/**
 * Vista / Rol par composante : libellé + 4 boutons GP/EE/AyS/G (header, toutes pages).
 * Sélection UNIQUE : GP = « Todo » (tout visible, actif par défaut) ; une composante
 * n'affiche qu'elle-même. Bouton coché = texte blanc sur fond rouge (accent) ; bouton non coché
 * = rempli de la couleur de sa composante.
 */
export function ComponentFilters({ selected, onToggle }: ComponentFiltersProps) {
  const esTodo = selected.size === COMPONENTES.length;
  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs font-medium uppercase tracking-wide text-[var(--text-muted)] sm:inline">
        Vista / Rol
      </span>
      <div
        className="flex flex-wrap items-center gap-1"
        role="group"
        aria-label="Vista por componente"
      >
        {COMPONENTES.map((c) => {
          // Sélection unique : GP coché = mode « Todo » ; sinon la composante seule.
          const on = c.code === "GP" ? esTodo : !esTodo && selected.has(c.code);
          return (
            <button
              key={c.code}
              type="button"
              aria-pressed={on}
              title={c.nombre}
              onClick={() => onToggle(c.code)}
              className={cn(
                "inline-flex items-center rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                on && "bg-[var(--accent)] text-white",
              )}
              style={on ? undefined : { backgroundColor: c.color, color: c.onColor }}
            >
              {c.code}
            </button>
          );
        })}
      </div>
    </div>
  );
}
