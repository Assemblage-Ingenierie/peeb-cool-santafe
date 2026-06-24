"use client";

import { useEffect, useRef, type PointerEvent } from "react";
import type { SnapshotEvento } from "@/lib/snapshot";
import { getComponente } from "@/lib/constants";
import { cn } from "@/lib/cn";

// Date du jour (locale), au format YYYY-MM-DD pour comparer aux `fecha` brutes.
function todayStr(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Format sûr (sans parser de Date → pas de décalage de fuseau) : DD/MM/AAAA · HH:MM.
function fmtFechaHora(fecha: string, hora: string | null): string {
  const [y, m, d] = fecha.split("-");
  let s = `${d}/${m}/${y}`;
  if (hora) s += ` · ${hora.slice(0, 5)}`;
  return s;
}

// Recale le défilement sur le prochain événement à venir (ou le dernier si tous
// passés). Helper au niveau module → stable, sans mémoïsation manuelle (compatible
// React Compiler).
function scrollToTarget(c: HTMLDivElement | null, firstUpcoming: number) {
  if (!c) return;
  const target =
    firstUpcoming >= 0
      ? (c.children[firstUpcoming] as HTMLElement | undefined)
      : (c.lastElementChild as HTMLElement | null);
  if (target) target.scrollIntoView({ behavior: "auto", inline: "start", block: "nearest" });
  else c.scrollLeft = 0;
}

interface AgendaProps {
  eventos: SnapshotEvento[];
  loading: boolean;
  error: string | null;
  labelClassName?: string;
  labelFooter?: React.ReactNode; // sous le libellé « Agenda » (ex. alerte « +N »)
}

/**
 * Agenda horizontale (CDC §4.1 / capture V2) : événements passés ET futurs,
 * passés estompés ; calée par défaut sur le prochain événement à venir.
 * Cliquer le libellé « Agenda » réinitialise le défilement.
 */
export function Agenda({ eventos, loading, error, labelClassName, labelFooter }: AgendaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const today = todayStr();

  // Événements nommés uniquement (on ignore les brouillons sans titre), triés.
  const items = eventos
    .filter((e) => (e.nombre ?? "").trim() !== "")
    .slice()
    .sort((a, b) =>
      a.fecha < b.fecha
        ? -1
        : a.fecha > b.fecha
          ? 1
          : (a.hora_inicio ?? "").localeCompare(b.hora_inicio ?? ""),
    );

  const firstUpcoming = items.findIndex((e) => e.fecha >= today);

  // Recalage par défaut au montage et quand la liste change.
  useEffect(() => {
    const id = requestAnimationFrame(() => scrollToTarget(scrollRef.current, firstUpcoming));
    return () => cancelAnimationFrame(id);
  }, [firstUpcoming]);

  // Défilement horizontal par glisser (souris) ; tactile = défilement natif.
  const drag = useRef({ down: false, startX: 0, startLeft: 0 });
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const c = scrollRef.current;
    if (!c) return;
    drag.current = { down: true, startX: e.clientX, startLeft: c.scrollLeft };
    c.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current.down) return;
    const c = scrollRef.current;
    if (c) c.scrollLeft = drag.current.startLeft - (e.clientX - drag.current.startX);
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    drag.current.down = false;
    scrollRef.current?.releasePointerCapture?.(e.pointerId);
  };

  return (
    <section className="flex items-start gap-4">
      <div className={cn(labelClassName, "flex flex-col gap-1")}>
        <button
          type="button"
          onClick={() => scrollToTarget(scrollRef.current, firstUpcoming)}
          title="Volver al próximo evento"
          className="rounded-md text-left text-base font-semibold text-white transition-colors hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
        >
          Agenda
        </button>
        {labelFooter}
      </div>

      <div
        ref={scrollRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="no-scrollbar relative flex min-w-0 flex-1 cursor-grab select-none gap-3 overflow-x-auto pb-2 active:cursor-grabbing"
      >
        {loading ? (
          <p className="py-6 text-sm text-[var(--text-muted)]">Cargando…</p>
        ) : error ? (
          <p className="py-6 text-sm text-[var(--text-muted)]">No se pudo cargar la agenda.</p>
        ) : items.length === 0 ? (
          <p className="py-6 text-sm text-[var(--text-muted)]">No hay eventos.</p>
        ) : (
          items.map((e) => {
            const comp = e.componente ? getComponente(e.componente) : undefined;
            const past = e.fecha < today;
            return (
              <article
                key={e.uid}
                className={cn(
                  "min-w-[200px] max-w-[220px] shrink-0 rounded-md p-3 transition-opacity",
                  past && "opacity-30",
                  !comp && "border border-[var(--border)] bg-[var(--surface)]",
                )}
                style={comp ? { backgroundColor: comp.color, color: comp.onColor } : undefined}
              >
                <h3 className={cn("truncate text-sm font-semibold", !comp && "text-[var(--text)]")} title={e.nombre}>
                  {e.nombre}
                </h3>
                <p className={cn("mt-1 text-xs", comp ? "opacity-80" : "text-[var(--text-muted)]")}>
                  {fmtFechaHora(e.fecha, e.hora_inicio)}
                </p>
                {e.participantesLabels.length > 0 && (
                  <p className={cn("mt-1 line-clamp-2 text-xs", comp ? "opacity-80" : "text-[var(--text-muted)]")}>
                    {e.participantesLabels.join(", ")}
                  </p>
                )}
                {e.lugar && (
                  <p className={cn("mt-1 truncate text-xs", comp ? "opacity-80" : "text-[var(--text-muted)]")} title={e.lugar}>
                    {e.lugar}
                  </p>
                )}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
