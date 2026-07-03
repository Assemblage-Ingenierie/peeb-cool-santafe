"use client";

import { useEffect, useRef, useState, type PointerEvent, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import { COMPONENTES } from "@/lib/constants";
import { notaCrear, notaActualizar, notaEliminar, type NotaRow } from "@/app/notas/actions";

// ============================================================
// Notas — whiteboard admin. Post-its colorés (composante ou blanc), déplaçables,
// avec titre et corps enrichi (gras). Persistance : peebcoolsf_notas.
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

const NOTA_W = 220;

export function NotasClient({ initial }: { initial: NotaRow[] }) {
  const [notas, setNotas] = useState<NotaRow[]>(initial);
  const boardRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);

  const setNota = (id: string, patch: Partial<NotaRow>) =>
    setNotas((ns) => ns.map((n) => (n.id === id ? { ...n, ...patch } : n)));

  const agregar = (color: string) => {
    const x = 40 + (notas.length % 6) * 30;
    const y = 40 + (notas.length % 6) * 30;
    notaCrear(color, x, y)
      .then((row) => setNotas((ns) => [...ns, row]))
      .catch(() => {});
  };
  const eliminar = (id: string) => {
    setNotas((ns) => ns.filter((n) => n.id !== id));
    notaEliminar(id).catch(() => {});
  };

  // --- Déplacement (poignée) ---
  const onGripDown = (e: PointerEvent<HTMLElement>, n: NotaRow) => {
    const board = boardRef.current;
    if (!board) return;
    const br = board.getBoundingClientRect();
    drag.current = { id: n.id, dx: e.clientX - br.left - n.x, dy: e.clientY - br.top - n.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onGripMove = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    const board = boardRef.current;
    if (!d || !board) return;
    const br = board.getBoundingClientRect();
    setNota(d.id, {
      x: Math.max(0, e.clientX - br.left - d.dx),
      y: Math.max(0, e.clientY - br.top - d.dy),
    });
  };
  const onGripUp = () => {
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
            Notas libres (privadas, solo Admin). Título, texto con <strong>negrita</strong> (Ctrl/Cmd+B),
            colores y arrastre.
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
        {notas.map((n) => (
          <NotaCard
            key={n.id}
            nota={n}
            opcion={opcionDe(n.color)}
            onTitulo={(v) => setNota(n.id, { titulo: v })}
            onTituloBlur={(v) => notaActualizar(n.id, { titulo: v }).catch(() => {})}
            onContenidoBlur={(html) => notaActualizar(n.id, { contenido: html }).catch(() => {})}
            onColor={(code) => {
              setNota(n.id, { color: code });
              notaActualizar(n.id, { color: code }).catch(() => {});
            }}
            onEliminar={() => eliminar(n.id)}
            onGripDown={(e) => onGripDown(e, n)}
            onGripMove={onGripMove}
            onGripUp={onGripUp}
          />
        ))}
      </div>
    </div>
  );
}

function NotaCard({
  nota,
  opcion,
  onTitulo,
  onTituloBlur,
  onContenidoBlur,
  onColor,
  onEliminar,
  onGripDown,
  onGripMove,
  onGripUp,
}: {
  nota: NotaRow;
  opcion: Opcion;
  onTitulo: (v: string) => void;
  onTituloBlur: (v: string) => void;
  onContenidoBlur: (html: string) => void;
  onColor: (code: string) => void;
  onEliminar: () => void;
  onGripDown: (e: PointerEvent<HTMLElement>) => void;
  onGripMove: (e: PointerEvent<HTMLElement>) => void;
  onGripUp: () => void;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  // Corps enrichi NON contrôlé : on pose le HTML une seule fois au montage
  // (React ne réécrit pas l'innerHTML aux re-rendus → pas de saut de curseur).
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.innerHTML = nota.contenido;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const negrita = () => document.execCommand("bold");
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
      e.preventDefault();
      negrita();
    }
  };

  return (
    <div
      className="absolute flex flex-col rounded-md shadow-md"
      style={{ left: nota.x, top: nota.y, width: NOTA_W, backgroundColor: opcion.bg, color: opcion.text }}
    >
      {/* Barre : poignée (drag) + couleurs + gras + suppression */}
      <div className="flex items-center gap-1 px-1.5 pt-1.5">
        <span
          onPointerDown={onGripDown}
          onPointerMove={onGripMove}
          onPointerUp={onGripUp}
          title="Mover"
          className="cursor-grab select-none px-0.5 text-current opacity-50 active:cursor-grabbing"
          aria-label="Mover nota"
        >
          <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor" aria-hidden="true">
            <circle cx="6" cy="4" r="1.3" /><circle cx="10" cy="4" r="1.3" />
            <circle cx="6" cy="8" r="1.3" /><circle cx="10" cy="8" r="1.3" />
            <circle cx="6" cy="12" r="1.3" /><circle cx="10" cy="12" r="1.3" />
          </svg>
        </span>
        <div className="flex items-center gap-1">
          {OPCIONES.map((o) => (
            <button
              key={o.code}
              type="button"
              onClick={() => onColor(o.code)}
              title={o.label}
              aria-label={`Color ${o.label}`}
              className={cn(
                "h-3 w-3 rounded-full border transition-transform hover:scale-110",
                nota.color === o.code ? "border-current ring-1 ring-current" : "border-black/20",
              )}
              style={{ backgroundColor: o.bg }}
            />
          ))}
        </div>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault(); // garde la sélection dans l'éditeur
            negrita();
          }}
          title="Negrita (Ctrl/Cmd+B)"
          aria-label="Negrita"
          className="ml-1 rounded border border-current/30 px-1 text-[11px] font-bold leading-none text-current opacity-70 hover:opacity-100"
        >
          N
        </button>
        <button
          type="button"
          onClick={onEliminar}
          aria-label="Eliminar nota"
          title="Eliminar"
          className="ml-auto rounded p-0.5 text-current opacity-60 transition-opacity hover:opacity-100"
        >
          <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
            <path d="M1 1 L11 11 M11 1 L1 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Titre */}
      <input
        value={nota.titulo}
        onChange={(e) => onTitulo(e.target.value)}
        onBlur={(e) => onTituloBlur(e.target.value)}
        placeholder="Título"
        className="mx-2 mt-1 border-b border-current/20 bg-transparent pb-0.5 text-sm font-semibold text-current outline-none placeholder:text-current placeholder:opacity-40"
      />

      {/* Corps enrichi (gras) */}
      <div
        ref={bodyRef}
        contentEditable
        suppressContentEditableWarning
        data-ph="Escribí…"
        onKeyDown={onKeyDown}
        onBlur={() => onContenidoBlur(bodyRef.current?.innerHTML ?? "")}
        className="m-2 mt-1 min-h-[64px] rounded-sm p-1 text-sm leading-snug text-current outline-none"
      />
    </div>
  );
}
