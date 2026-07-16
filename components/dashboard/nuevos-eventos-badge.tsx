"use client";

import { useEffect, useState } from "react";
import type { SnapshotActividad } from "@/lib/snapshot";
import { isAdmin } from "@/lib/auth";
import { useAuthUser } from "@/components/auth-context";
import { cn } from "@/lib/cn";
import { fmtFecha } from "@/components/calendario/fechas";

// Marqueur « déjà vu » (ISO). Faute d'auth réelle, on mémorise côté navigateur ;
// à l'Étape 6, déplacer en per-utilisateur (DB). Clé distincte du fuseau Calendario.
const VISTOS_KEY = "peebcoolsf:agenda:vistos";

/**
 * Alerte « +N » sous « Agenda » (Inicio) : nombre de réunions ajoutées/supprimées
 * depuis la dernière consultation de l'admin. Clic → popup listant les nouveautés,
 * puis remise à zéro (le compteur s'incrémente tant qu'on ne clique pas).
 * Visible pour l'admin (en dev, bypass = admin ; Étape 6 = vraie session).
 */
export function NuevosEventosBadge({ actividad }: { actividad: SnapshotActividad[] }) {
  const admin = isAdmin(useAuthUser());
  const [vistos, setVistos] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(VISTOS_KEY);
  });
  const [popup, setPopup] = useState<SnapshotActividad[] | null>(null);

  // Réservé à l'admin.
  if (!admin) return null;

  const nuevos = actividad.filter((a) => !vistos || a.creadoEn > vistos);
  const n = nuevos.length;

  const abrir = () => {
    setPopup(nuevos);
    const ahora = new Date().toISOString();
    setVistos(ahora);
    window.localStorage.setItem(VISTOS_KEY, ahora);
  };

  if (n === 0 && !popup) return null;

  return (
    <>
      {n > 0 && (
        <button
          type="button"
          onClick={abrir}
          title={`${n} novedad(es) en el calendario`}
          className="inline-flex w-fit items-center gap-1 rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
        >
          +{n}
        </button>
      )}
      {popup && <PopupNovedades items={popup} onClose={() => setPopup(null)} />}
    </>
  );
}

function PopupNovedades({
  items,
  onClose,
}: {
  items: SnapshotActividad[];
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="novedades-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-xl bg-[var(--surface)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
          <h2 id="novedades-title" className="text-base font-semibold text-[var(--text)]">
            Novedades del calendario
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-8 w-8 items-center justify-center rounded-md text-lg text-[var(--text-muted)] hover:bg-[var(--app-bg)]"
          >
            ×
          </button>
        </div>

        <ul className="flex max-h-80 flex-col divide-y divide-[var(--border)] overflow-auto">
          {items.map((a) => {
            const eliminado = a.tipo === "eliminado";
            return (
              <li key={a.id} className="flex items-start gap-3 px-5 py-3">
                <span
                  className={cn(
                    "mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                    eliminado
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[#d9ead3] text-[#272a33]",
                  )}
                >
                  {eliminado ? "Eliminada" : "Nueva"}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm text-[var(--text)]">{a.eventoNombre || "—"}</p>
                  {a.eventoFecha && (
                    <p className="text-xs text-[var(--text-muted)]">{fmtFecha(a.eventoFecha)}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
