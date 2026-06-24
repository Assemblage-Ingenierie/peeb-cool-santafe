"use client";

import { useState } from "react";
import { REQUISITOS_AYS, refMgas } from "@/lib/constants";
import { cn } from "@/lib/cn";

// ============================================================
// Éditeur « Requisitos AyS » (CDC §4.5 — nouveau mécanisme). 3 groupes MGAS
// repliables (clic = déplier les cases), repliés par défaut, + zone de texte libre.
// État optimiste géré par le parent (SubproyectosPanel).
// ============================================================

const AYS_GREEN = "#639922"; // teinte AyS pour la case cochée

interface AysRequisitosEditorProps {
  subUid: string; // clé de remontage du textarea quand on change de sous-projet
  checked: Set<string>; // codes § cochés
  texto: string;
  onToggle: (code: string, activa: boolean) => void;
  onText: (texto: string) => void;
}

export function AysRequisitosEditor({
  subUid,
  checked,
  texto,
  onToggle,
  onText,
}: AysRequisitosEditorProps) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggleOpen = (code: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        {REQUISITOS_AYS.map((g, gi) => {
          const isOpen = open.has(g.code);
          const nChecked = g.requisitos.filter((r) => checked.has(r.code)).length;
          return (
            <div key={g.code} className={cn(gi > 0 && "border-t border-[var(--border)]")}>
              <button
                type="button"
                onClick={() => toggleOpen(g.code)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-[var(--app-bg)]"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "text-[var(--text-muted)] transition-transform",
                    isOpen && "rotate-90",
                  )}
                >
                  ›
                </span>
                <span className="flex-1 text-sm font-medium text-[var(--text)]">
                  {g.titulo}{" "}
                  <span className="font-normal text-[var(--text-muted)]">({refMgas(g.code)})</span>
                </span>
                {nChecked > 0 && (
                  <span className="shrink-0 rounded-full bg-[var(--app-bg)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
                    {nChecked}/{g.requisitos.length}
                  </span>
                )}
              </button>

              {isOpen && (
                <ul className="space-y-0.5 px-4 pb-3">
                  {g.requisitos.map((r) => (
                    <li key={r.code}>
                      <label className="flex cursor-pointer items-start gap-2.5 rounded px-1 py-1 text-sm hover:bg-[var(--app-bg)]">
                        <input
                          type="checkbox"
                          checked={checked.has(r.code)}
                          onChange={(e) => onToggle(r.code, e.target.checked)}
                          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer"
                          style={{ accentColor: AYS_GREEN }}
                        />
                        <span className="text-[var(--text)]">
                          {r.label}{" "}
                          <span className="text-xs text-[var(--text-muted)]">({refMgas(r.code)})</span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
          Texto libre
        </label>
        <textarea
          key={subUid}
          defaultValue={texto}
          placeholder="Especificidades ambientales y sociales…"
          rows={3}
          onBlur={(e) => {
            if (e.target.value !== texto) onText(e.target.value);
          }}
          className="block w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--focus)]"
        />
      </div>
    </div>
  );
}
