"use client";

import { useState } from "react";
import type { SnapshotPersona } from "@/lib/snapshot";
import { cn } from "@/lib/cn";

interface ParticipantesPickerProps {
  personas: SnapshotPersona[];
  value: string[]; // UID sélectionnés
  onChange: (next: string[]) => void;
}

/**
 * Sélecteur multiple de participants (equipo + entidades) avec recherche.
 * Panneau déroulant EN FLUX (pas en absolu) pour ne pas être rogné par le modal.
 */
export function ParticipantesPicker({ personas, value, onChange }: ParticipantesPickerProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const sel = new Set(value);
  const toggle = (uid: string) => {
    const next = new Set(sel);
    if (next.has(uid)) next.delete(uid);
    else next.add(uid);
    onChange([...next]);
  };
  const labelOf = (uid: string) => personas.find((p) => p.uid === uid)?.label ?? uid;

  const filtro = q.trim().toLowerCase();
  const visibles = filtro ? personas.filter((p) => p.label.toLowerCase().includes(filtro)) : personas;
  const equipo = visibles.filter((p) => p.tipo === "equipo");
  const entidades = visibles.filter((p) => p.tipo === "entidad");

  return (
    <div>
      {/* Sélection courante (chips retirables) */}
      {value.length > 0 && (
        <div className="mb-1 flex flex-wrap gap-1">
          {value.map((uid) => (
            <span
              key={uid}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--app-bg)] px-2 py-0.5 text-xs text-[var(--text)]"
            >
              {labelOf(uid)}
              <button
                type="button"
                onClick={() => toggle(uid)}
                aria-label={`Quitar ${labelOf(uid)}`}
                className="text-[var(--text-muted)] hover:text-[var(--accent)]"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-left text-sm text-[var(--text-muted)] transition-colors hover:border-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
      >
        {value.length > 0 ? `${value.length} seleccionado(s) — editar` : "Agregar participantes"}
      </button>

      {open && (
        <div className="mt-1 rounded-md border border-[var(--border)] bg-[var(--surface)] p-2">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar…"
            className="mb-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
          />
          <div className="max-h-52 overflow-auto">
            {visibles.length === 0 ? (
              <p className="px-1 py-3 text-center text-xs text-[var(--text-muted)]">Sin resultados</p>
            ) : (
              <>
                {equipo.length > 0 && <Grupo titulo="Equipo" items={equipo} sel={sel} toggle={toggle} />}
                {entidades.length > 0 && (
                  <Grupo titulo="Entidades" items={entidades} sel={sel} toggle={toggle} />
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Grupo({
  titulo,
  items,
  sel,
  toggle,
}: {
  titulo: string;
  items: SnapshotPersona[];
  sel: Set<string>;
  toggle: (uid: string) => void;
}) {
  return (
    <div className="mb-1">
      <p className="px-1 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        {titulo}
      </p>
      {items.map((p) => {
        const on = sel.has(p.uid);
        return (
          <label
            key={p.uid}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-[var(--app-bg)]",
              on && "bg-[var(--app-bg)]",
            )}
          >
            <input
              type="checkbox"
              checked={on}
              onChange={() => toggle(p.uid)}
              className="h-4 w-4 accent-[var(--focus)]"
            />
            <span className="truncate text-[var(--text)]">{p.label}</span>
          </label>
        );
      })}
    </div>
  );
}
