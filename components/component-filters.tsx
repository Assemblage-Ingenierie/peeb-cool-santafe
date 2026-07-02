"use client";

import { COMPONENTES } from "@/lib/constants";
import { cn } from "@/lib/cn";

interface ComponentFiltersProps {
  selected: Set<string>;
  onToggle: (code: string) => void;
}

/**
 * Vista / Rol par composante : libellé + 4 boutons GP/EE/AyS/G (header, toutes pages).
 *  • GP = « Todo » : tout visible. Actif par défaut ; grisé dès qu'une composante
 *    est cochée (c'est lui qui réinitialise l'affichage complet).
 *  • EE / AyS / G : n'affiche que la (les) composante(s) cochée(s).
 * Bouton actif = texte blanc sur fond foncé + pastille de couleur ; inactif = neutre.
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
          // GP actif = mode « Todo » ; autres actifs = cochés hors mode Todo.
          const on = c.code === "GP" ? esTodo : !esTodo && selected.has(c.code);
          return (
            <button
              key={c.code}
              type="button"
              aria-pressed={on}
              title={c.nombre}
              onClick={() => onToggle(c.code)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                on
                  ? "bg-[var(--text)] text-white"
                  : "border border-[var(--border)] bg-[var(--app-bg)] text-[var(--text-muted)] hover:text-[var(--text)]",
              )}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: c.color }}
                aria-hidden="true"
              />
              {c.code}
            </button>
          );
        })}
      </div>
    </div>
  );
}
