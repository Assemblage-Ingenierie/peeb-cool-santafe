"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { rolLabel, type RequestedStatus } from "@/lib/auth";
import { useAuthUser } from "@/components/auth-context";
import { updateMyProfile } from "@/app/account/actions";

type Section = "info" | "requests";

export function MyAccountModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const user = useAuthUser();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const status = user?.rol ?? "consultor";

  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [jobTitle, setJobTitle] = useState(user?.jobTitle ?? "");
  const [requested, setRequested] = useState<RequestedStatus>(user?.requestedStatus ?? null);

  const [section, setSection] = useState<Section>("info");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const initial = {
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    jobTitle: user?.jobTitle ?? "",
    requested: user?.requestedStatus ?? null,
  };
  const isDirty =
    firstName !== initial.firstName ||
    lastName !== initial.lastName ||
    jobTitle !== initial.jobTitle ||
    requested !== initial.requested;

  const canRequestGestion = status === "consultor";
  const canRequestAdmin = status === "consultor" || status === "gestion";

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const res = await updateMyProfile({ firstName, lastName, jobTitle, requestedStatus: requested });
    setSaving(false);
    if (res?.error) {
      setError(res.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  if (!mounted) return null;

  const readOnlyInput =
    "mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--text-muted)] cursor-not-allowed";
  const input =
    "mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--focus)]";
  const label = "text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]";

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-2xl overflow-hidden rounded-xl bg-[var(--surface)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Menu gauche */}
        <aside className="w-48 shrink-0 border-r border-[var(--border)] bg-[var(--app-bg)] p-4">
          <h2 className="mb-3 px-2 text-sm font-bold text-[var(--text)]">Mi cuenta</h2>
          {(
            [
              ["info", "Mis datos"],
              ["requests", "Mis solicitudes"],
            ] as [Section, string][]
          ).map(([id, txt]) => (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              className={
                "mb-1 block w-full rounded-md px-3 py-2 text-left text-sm transition-colors " +
                (section === id
                  ? "bg-[var(--surface)] font-semibold text-[var(--text)] shadow-sm"
                  : "text-[var(--text-muted)] hover:bg-[var(--surface)]")
              }
            >
              {txt}
            </button>
          ))}
        </aside>

        {/* Contenu */}
        <div className="flex min-h-[420px] flex-1 flex-col p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-[var(--text)]">
              {section === "info" ? "Mis datos" : "Mis solicitudes"}
            </h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="flex h-8 w-8 items-center justify-center rounded-md text-lg text-[var(--text-muted)] hover:bg-[var(--app-bg)]"
            >
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {section === "info" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={label}>Nombre</label>
                    <input className={input} value={firstName} onChange={(e) => { setSaved(false); setFirstName(e.target.value); }} />
                  </div>
                  <div>
                    <label className={label}>Apellido</label>
                    <input className={input} value={lastName} onChange={(e) => { setSaved(false); setLastName(e.target.value); }} />
                  </div>
                </div>
                <div>
                  <label className={label}>Cargo</label>
                  <input className={input} value={jobTitle} onChange={(e) => { setSaved(false); setJobTitle(e.target.value); }} placeholder="Ej. Ingeniero/a" />
                </div>
                <div>
                  <label className={label}>Correo electrónico</label>
                  <input className={readOnlyInput} value={user?.email ?? ""} readOnly />
                </div>
                <div>
                  <label className={label}>Nivel de acceso</label>
                  <input className={readOnlyInput} value={rolLabel(status)} readOnly />
                  <button
                    type="button"
                    onClick={() => setSection("requests")}
                    className="mt-1.5 block text-xs font-medium text-[var(--accent)] underline"
                  >
                    Solicitar cambio de nivel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-[var(--text-muted)]">
                  Tu nivel actual: <strong className="text-[var(--text)]">{rolLabel(status)}</strong>.
                  Una solicitud debe ser aprobada por un administrador.
                </p>

                {requested ? (
                  <div className="space-y-3">
                    <div className="rounded-md border border-[var(--border)] bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--text)]">
                      Solicitud de ascenso a <strong>{rolLabel(requested)}</strong>
                      {initial.requested === requested ? " — en espera de aprobación." : " (sin guardar)."}
                    </div>
                    <button
                      type="button"
                      onClick={() => { setSaved(false); setRequested(null); }}
                      className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--app-bg)]"
                    >
                      Cancelar solicitud
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {canRequestGestion && (
                      <button
                        type="button"
                        onClick={() => { setSaved(false); setRequested("gestion"); }}
                        className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-left text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--app-bg)]"
                      >
                        Solicitar nivel Gestión
                      </button>
                    )}
                    {canRequestAdmin && (
                      <button
                        type="button"
                        onClick={() => { setSaved(false); setRequested("admin"); }}
                        className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-left text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--app-bg)]"
                      >
                        Solicitar nivel Administrador
                      </button>
                    )}
                    {!canRequestGestion && !canRequestAdmin && (
                      <p className="text-sm text-[var(--text-muted)]">Ya tenés el nivel de acceso más alto.</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {error && <p className="mt-3 text-sm text-[var(--accent)]">{error}</p>}

          <div className="mt-4 flex items-center justify-end gap-3 border-t border-[var(--border)] pt-4">
            {saved && <span className="text-sm font-medium text-green-600">Perfil actualizado</span>}
            <button
              type="button"
              onClick={save}
              disabled={!isDirty || saving}
              className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
