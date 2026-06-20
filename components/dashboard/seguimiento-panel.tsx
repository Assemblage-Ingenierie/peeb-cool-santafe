"use client";

import type { SnapshotSubproyecto } from "@/lib/snapshot";
import { TIPOLOGIAS, getTipologia } from "@/lib/constants";
import { cn } from "@/lib/cn";

interface SeguimientoPanelProps {
  subproyectos: SnapshotSubproyecto[];
  tipo: string;
  onTipo: (t: string) => void;
  selected: string | null;
  onSelect: (uid: string) => void;
}

// Sélecteur : Todos + une entrée par typologie (Aeropuertos / Hospitales / Escuelas).
const TIPO_OPCIONES: { key: string; label: string }[] = [
  { key: "todos", label: "Todos" },
  ...TIPOLOGIAS.map((t) => ({ key: t.code, label: t.nombre })),
];

/**
 * Panneau central (déplié quand « Subproyectos ») : sélecteur par typologie +
 * tableau des sous-projets (colonnes de données à définir). La carte de sélection
 * arrive au sous-lot 4.1b. Le clic sur une ligne sélectionne le sous-projet.
 */
export function SeguimientoPanel({
  subproyectos,
  tipo,
  onTipo,
  selected,
  onSelect,
}: SeguimientoPanelProps) {
  const lista =
    tipo === "todos" ? subproyectos : subproyectos.filter((s) => s.tipologia === tipo);

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      {/* Sélecteur par typologie */}
      <nav className="flex shrink-0 flex-row flex-wrap gap-1 lg:w-44 lg:flex-col">
        {TIPO_OPCIONES.map((o) => {
          const on = tipo === o.key;
          return (
            <button
              key={o.key}
              type="button"
              aria-pressed={on}
              onClick={() => onTipo(o.key)}
              className={cn(
                "rounded-md px-3 py-2 text-left text-sm transition-colors",
                on
                  ? "bg-[var(--surface)] font-medium text-[var(--text)] shadow-sm ring-1 ring-[var(--border)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </nav>

      {/* Tableau central — placeholders de colonnes */}
      <div className="min-w-0 flex-1 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
              <th className="py-2 pr-3 font-medium">Subproyecto</th>
              <th className="px-3 py-2 font-medium">—</th>
              <th className="px-3 py-2 font-medium">—</th>
              <th className="px-3 py-2 font-medium">—</th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-[var(--text-muted)]">
                  No hay subproyectos.
                </td>
              </tr>
            ) : (
              lista.map((s) => {
                const tp = getTipologia(s.tipologia);
                const sel = s.uid === selected;
                return (
                  <tr
                    key={s.uid}
                    onClick={() => onSelect(s.uid)}
                    aria-selected={sel}
                    className={cn(
                      "cursor-pointer border-b border-[var(--border)] transition-colors hover:bg-[var(--app-bg)]",
                      sel && "bg-[var(--app-bg)]",
                    )}
                    style={sel ? { boxShadow: "inset 3px 0 0 var(--focus)" } : undefined}
                  >
                    <td className="py-2 pr-3">
                      <span className="flex items-center gap-2">
                        {tp && (
                          <span
                            className="inline-flex h-5 min-w-5 items-center justify-center rounded px-1 text-[10px] font-bold"
                            style={{ backgroundColor: tp.color, color: tp.onColor }}
                            title={tp.nombre}
                          >
                            {tp.code}
                          </span>
                        )}
                        <span className="font-medium text-[var(--text)]">{s.nombre}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[var(--text-muted)]">—</td>
                    <td className="px-3 py-2 text-[var(--text-muted)]">—</td>
                    <td className="px-3 py-2 text-[var(--text-muted)]">—</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-[var(--text-muted)]">Columnas de datos por definir.</p>
      </div>

      {/* Carte de sélection — sous-lot 4.1b */}
      <div className="shrink-0 lg:w-[320px]">
        <div className="flex h-full min-h-[260px] items-center justify-center rounded-md border border-dashed border-[var(--border)] bg-[var(--app-bg)] p-4 text-center text-xs text-[var(--text-muted)]">
          Mapa de selección (próximo sub-lote 4.1b)
        </div>
      </div>
    </div>
  );
}
