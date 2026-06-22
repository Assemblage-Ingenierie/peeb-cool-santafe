"use client";

import { useEffect, useState } from "react";
import type { SnapshotEvento, SnapshotPersona } from "@/lib/snapshot";
import { COMPONENTES } from "@/lib/constants";
import { cn } from "@/lib/cn";
import { crearEvento, actualizarEvento } from "@/app/calendario/actions";
import type { EventoInput } from "./tipos";
import { hoyStr } from "./fechas";
import { ParticipantesPicker } from "./participantes-picker";

interface EventoFormProps {
  modo: "crear" | "editar";
  evento?: SnapshotEvento; // requis en mode édition
  personas: SnapshotPersona[];
  onClose: () => void;
  onSaved: () => void;
}

const MODALIDADES = ["Presencial", "Virtual"];

/**
 * Formulaire de création / édition d'un événement (CDC §4.3). Ouvert à tous.
 * Les horaires sont saisis et stockés en HEURE D'ARGENTINE (valeur canonique) —
 * libellé explicite, indépendamment du fuseau d'affichage du calendrier.
 */
export function EventoForm({ modo, evento, personas, onClose, onSaved }: EventoFormProps) {
  const [nombre, setNombre] = useState(evento?.nombre ?? "");
  const [fecha, setFecha] = useState(evento?.fecha ?? hoyStr());
  const [horaInicio, setHoraInicio] = useState((evento?.hora_inicio ?? "").slice(0, 5));
  const [horaFin, setHoraFin] = useState((evento?.hora_fin ?? "").slice(0, 5));
  const [componente, setComponente] = useState(evento?.componente ?? "");
  const [modalidad, setModalidad] = useState(evento?.modalidad ?? "");
  const [lugar, setLugar] = useState(evento?.lugar ?? "");
  const [urlConexion, setUrlConexion] = useState(evento?.url_conexion ?? "");
  const [participantes, setParticipantes] = useState<string[]>(evento?.participantes ?? []);
  const [formacion, setFormacion] = useState(evento?.formacion ?? false);
  const [urlDocumento, setUrlDocumento] = useState(evento?.url_documento ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fermeture au clavier (Échap).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nombre.trim()) return setError("El nombre es obligatorio.");
    if (!fecha) return setError("La fecha es obligatoria.");

    const input: EventoInput = {
      nombre: nombre.trim(),
      fecha,
      hora_inicio: horaInicio || null,
      hora_fin: horaFin || null,
      componente: componente || null,
      modalidad: modalidad || null,
      lugar: lugar.trim() || null,
      url_conexion: modalidad === "Virtual" ? urlConexion.trim() || null : null,
      participantes,
      formacion,
      url_documento: urlDocumento.trim() || null,
    };

    setSubmitting(true);
    try {
      if (modo === "editar" && evento) await actualizarEvento(evento.uid, input);
      else await crearEvento(input);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="evento-form-title"
    >
      <form
        onSubmit={onSubmit}
        className="my-4 w-full max-w-md rounded-xl bg-[var(--surface)] shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
          <h2 id="evento-form-title" className="text-base font-semibold text-[var(--text)]">
            {modo === "editar" ? "Editar evento" : "Nuevo evento"}
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

        <div className="flex flex-col gap-3 px-5 py-4">
          <Campo label="Nombre" requerido>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              className={inputCls}
            />
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo label="Fecha" requerido>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
                className={inputCls}
              />
            </Campo>
            <Campo label="Componente">
              <select
                value={componente}
                onChange={(e) => setComponente(e.target.value)}
                className={inputCls}
              >
                <option value="">—</option>
                {COMPONENTES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </Campo>
          </div>

          <Campo label="Horario (hora de Argentina)">
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                className={inputCls}
              />
              <span className="text-[var(--text-muted)]">–</span>
              <input
                type="time"
                value={horaFin}
                onChange={(e) => setHoraFin(e.target.value)}
                className={inputCls}
              />
            </div>
          </Campo>

          <Campo label="Modalidad">
            <select
              value={modalidad}
              onChange={(e) => setModalidad(e.target.value)}
              className={inputCls}
            >
              <option value="">—</option>
              {MODALIDADES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Campo>

          {modalidad === "Virtual" && (
            <Campo label="URL de conexión">
              <input
                type="url"
                value={urlConexion}
                onChange={(e) => setUrlConexion(e.target.value)}
                placeholder="https://…"
                className={inputCls}
              />
            </Campo>
          )}

          {modalidad !== "Virtual" && (
            <Campo label="Lugar">
              <input
                type="text"
                value={lugar}
                onChange={(e) => setLugar(e.target.value)}
                className={inputCls}
              />
            </Campo>
          )}

          <Campo label="Participantes">
            <ParticipantesPicker personas={personas} value={participantes} onChange={setParticipantes} />
          </Campo>

          <label className="flex items-center gap-2 text-sm text-[var(--text)]">
            <input
              type="checkbox"
              checked={formacion}
              onChange={(e) => setFormacion(e.target.checked)}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            Formación
          </label>

          <Campo label="URL del documento">
            <input
              type="url"
              value={urlDocumento}
              onChange={(e) => setUrlDocumento(e.target.value)}
              placeholder="https://…"
              className={inputCls}
            />
          </Campo>

          {error && <p className="text-sm text-[var(--accent)]">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={cn(
              "rounded-md bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-white transition-opacity",
              submitting ? "opacity-60" : "hover:opacity-90",
            )}
          >
            {submitting ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]";

function Campo({
  label,
  requerido,
  children,
}: {
  label: string;
  requerido?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
        {label}
        {requerido && <span className="text-[var(--accent)]"> *</span>}
      </span>
      {children}
    </label>
  );
}
