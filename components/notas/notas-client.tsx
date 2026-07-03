"use client";

import { useRef, useState, type PointerEvent } from "react";
import { cn } from "@/lib/cn";
import { COMPONENTES } from "@/lib/constants";
import { notaCrear, notaActualizar, notaEliminar, type NotaRow } from "@/app/notas/actions";

// ============================================================
// Notas — whiteboard admin. Post-its colorés (par composante ou blanc),
// déplaçables et éditables (texte libre). Persistance : peebcoolsf_notas.
// État optimiste + Server Actions (fire-and-forget).
// ============================================================

interface Opcion {
  code: string;
  bg: string;
  text: string;
  label: string;
}
const OPCIONES: Opcion[] = [
  { code: "blanco", bg: "#ffffff", text: "#1f2733", label: "Blanco" },
  ...COMPONENTES.map((c) => ({ code: c.code, bg: c.color, text: c.onColor, label: c.code })),
];
const opcionDe = (code: string) => OPCIONES.find((o) => o.code === code) ?? OPCIONES[0];

const NOTA_W = 210;

export function NotasClient({ initial }: { initial: NotaRow[] }) {
  const [notas, setNotas] = useState<NotaRow[]>(initial);
  const boardRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);

  const setNota = (id: string, patch: Partial<NotaRow>) =>
    setNotas((ns) => ns.map((n) => (n.id === id ? { ...n, ...patch } : n)));

  const agregar = (color: string) => {
    // Position en cascade selon le nombre de notas existantes.
    const x = 40 + (notas.length % 6) * 28;
    const y = 40 + (notas.length % 6) * 28;
    notaCrear(color, x, y)
      .then((row) => setNotas((ns) => [...ns, row]))
      .catch(() => {});
  };

  const eliminar = (id: string) => {
    setNotas((ns) => ns.filter((n) => n.id !== id));
    notaEliminar(id).catch(() => {});
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>, n: NotaRow) => {
    // Ne pas démarrer le drag depuis le texte ou un bouton.
    const t = e.target as HTMLElement;
    if (t.closest("textarea, button")) return;
    const board = boardRef.current;
    if (!board) return;
    const br = board.getBoundingClientRect();
    drag.current = { id: n.id, dx: e.clientX - br.left - n.x, dy: e.clientY - br.top - n.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const board = boardRef.current;
    if (!d || !board) return;
    const br = board.getBoundingClientRect();
    const x = Math.max(0, e.clientX - br.left - d.dx);
    const y = Math.max(0, e.clientY - br.top - d.dy);
    setNota(d.id, { x, y });
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const n = notas.find((x) => x.id === d.id);
    if (n) notaActualizar(n.id, { x: n.x, y: n.y }).catch(() => {});
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--text)]">Notas</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Notas libres (privadas, solo Admin). Agregá post-its, escribí y arrastralos.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Agregar</span>
          {OPCIONES.map((o) => (
            <button
              key={o.code}
              type="button"
              onClick={() => agregar(o.code)}
              title={`Agregar nota ${o.label}`}
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text)] transition-colors hover:bg-[var(--app-bg)]"
            >
              <span className="h-3 w-3 rounded-sm border border-[var(--border)]" style={{ backgroundColor: o.bg }} />
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tableau */}
      <div
        ref={boardRef}
        className="relative min-h-[70vh] w-full overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]"
        style={{
          backgroundImage: "radial-gradient(var(--border) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      >
        {notas.length === 0 && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-[var(--text-muted)]">
            Sin notas. Agregá una con los botones de arriba.
          </p>
        )}
        {notas.map((n) => {
          const op = opcionDe(n.color);
          return (
            <div
              key={n.id}
              onPointerDown={(e) => onPointerDown(e, n)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              className="absolute flex cursor-grab flex-col rounded-md shadow-md active:cursor-grabbing"
              style={{ left: n.x, top: n.y, width: NOTA_W, backgroundColor: op.bg, color: op.text }}
            >
              {/* Barre : sélecteur de couleur + suppression */}
              <div className="flex items-center justify-between gap-1 px-2 pt-1.5">
                <div className="flex items-center gap-1">
                  {OPCIONES.map((o) => (
                    <button
                      key={o.code}
                      type="button"
                      onClick={() => {
                        setNota(n.id, { color: o.code });
                        notaActualizar(n.id, { color: o.code }).catch(() => {});
                      }}
                      title={o.label}
                      aria-label={`Color ${o.label}`}
                      className={cn(
                        "h-3 w-3 rounded-full border transition-transform hover:scale-110",
                        n.color === o.code ? "border-current ring-1 ring-current" : "border-black/20",
                      )}
                      style={{ backgroundColor: o.bg }}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => eliminar(n.id)}
                  aria-label="Eliminar nota"
                  title="Eliminar"
                  className="rounded p-0.5 text-current opacity-60 transition-opacity hover:opacity-100"
                >
                  <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
                    <path d="M1 1 L11 11 M11 1 L1 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <textarea
                value={n.contenido}
                onChange={(e) => setNota(n.id, { contenido: e.target.value })}
                onBlur={() => notaActualizar(n.id, { contenido: n.contenido }).catch(() => {})}
                placeholder="Escribí…"
                rows={4}
                className="m-2 mt-1 resize-y rounded-sm bg-transparent p-1 text-sm leading-snug text-current outline-none placeholder:text-current placeholder:opacity-40"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
