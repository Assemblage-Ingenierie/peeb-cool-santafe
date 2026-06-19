"use client";

import { COMPONENTES } from "@/lib/constants";
import { cn } from "@/lib/cn";

interface ComponentFiltersProps {
  selected: Set<string>;
  onToggle: (code: string) => void;
}

/** Filtres par composante (GP/EE/AyS/G). Chips toggle, visuels uniquement à l'Étape 2. */
export function ComponentFilters({ selected, onToggle }: ComponentFiltersProps) {
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label="Filtrar por componente">
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
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
              !on && "border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--app-bg)]",
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
  );
}
