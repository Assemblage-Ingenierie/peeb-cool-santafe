"use client";

import { useEffect } from "react";
import type { SnapshotEvento } from "@/lib/snapshot";
import { getComponente } from "@/lib/constants";
import { cn } from "@/lib/cn";
import {
  fmtFecha,
  horaRangoEnZona,
  offsetLabel,
  parseFecha,
  ZONA_NOMBRE,
  type Zona,
} from "./fechas";

interface EventoModalProps {
  evento: SnapshotEvento;
  zona: Zona;
  onClose: () => void;
}

/**
 * Détail d'un événement au clic (CDC §4.3). Lecture seule : nom, date + horaire
 * (dans le fuseau actif), lugar, modalidad (+ lien si Virtual), participantes,
 * badge Formación, lien vers le document. L'édition arrivera au sous-lot 3.
 */
export function EventoModal({ evento, zona, onClose }: EventoModalProps) {
  // Fermeture au clavier (Échap).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const comp = evento.componente ? getComponente(evento.componente) : undefined;
  const [y, m] = parseFecha(evento.fecha);
  const rango = horaRangoEnZona(evento.fecha, evento.hora_inicio, evento.hora_fin, zona);
  const zonaTxt = `${ZONA_NOMBRE[zona]}, ${offsetLabel(zona, y, m - 1)}`;
  const esVirtual = (evento.modalidad ?? "").toLowerCase() === "virtual";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="evento-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-xl bg-[var(--surface)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête : bande de couleur de la composante + titre */}
        <div
          className="flex items-start justify-between gap-3 px-5 py-4"
          style={comp ? { backgroundColor: comp.color, color: comp.onColor } : undefined}
        >
          <div className="min-w-0">
            <h2
              id="evento-modal-title"
              className={cn("text-base font-semibold", !comp && "text-[var(--text)]")}
            >
              {evento.nombre}
            </h2>
            {comp && <p className="mt-0.5 text-xs opacity-80">{comp.nombre}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className={cn(
              "-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-lg transition-colors",
              comp ? "hover:bg-black/10" : "text-[var(--text-muted)] hover:bg-[var(--app-bg)]",
            )}
          >
            ×
          </button>
        </div>

        {/* Corps : détails */}
        <dl className="flex flex-col gap-3 px-5 py-4 text-sm">
          <Fila etiqueta="Fecha">
            <span className="text-[var(--text)]">{fmtFecha(evento.fecha)}</span>
          </Fila>

          <Fila etiqueta="Horario">
            {rango ? (
              <span className="text-[var(--text)]">
                {rango}{" "}
                <span className="text-xs text-[var(--text-muted)]">({zonaTxt})</span>
              </span>
            ) : (
              <span className="text-[var(--text-muted)]">Sin horario</span>
            )}
          </Fila>

          {evento.modalidad && (
            <Fila etiqueta="Modalidad">
              <span className="text-[var(--text)]">{evento.modalidad}</span>
              {esVirtual && evento.url_conexion && (
                <a
                  href={evento.url_conexion}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-[var(--focus)] underline-offset-2 hover:underline"
                >
                  Unirse a la reunión
                </a>
              )}
            </Fila>
          )}

          {evento.lugar && (
            <Fila etiqueta="Lugar">
              <span className="text-[var(--text)]">{evento.lugar}</span>
            </Fila>
          )}

          {evento.participantesLabels.length > 0 && (
            <Fila etiqueta="Participantes">
              <div className="flex flex-wrap gap-1">
                {evento.participantesLabels.map((p, i) => (
                  <span
                    key={`${p}-${i}`}
                    className="rounded-full bg-[var(--app-bg)] px-2 py-0.5 text-xs text-[var(--text)]"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </Fila>
          )}

          {(evento.formacion || evento.url_documento) && (
            <Fila etiqueta="Documento">
              <div className="flex flex-wrap items-center gap-2">
                {evento.formacion && (
                  <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs font-medium text-white">
                    Formación
                  </span>
                )}
                {evento.url_documento && (
                  <a
                    href={evento.url_documento}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--focus)] underline-offset-2 hover:underline"
                  >
                    Ver documento
                  </a>
                )}
              </div>
            </Fila>
          )}
        </dl>
      </div>
    </div>
  );
}

/** Ligne « étiquette / valeur » du détail. */
function Fila({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] items-baseline gap-2">
      <dt className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
        {etiqueta}
      </dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}
