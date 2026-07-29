"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { rolLabel, PENDIENTE_LABEL, type Rol } from "@/lib/auth";
import {
  adminSetStatus,
  adminApproveRequest,
  adminRejectRequest,
  adminApproveAccess,
  adminRevokeAccess,
} from "@/app/roles/actions";

export interface UserRow {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  job_title: string | null;
  status: Rol;
  requested_status: "gestion" | "admin" | null;
  is_approved: boolean;
}

const ROLES: Rol[] = ["admin", "gestion", "consultor"];

function nombreCompleto(u: UserRow): string {
  const n = [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
  return n || u.email || "—";
}

export function RolesClient({
  users,
  currentUserId,
}: {
  users: UserRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Niveau choisi par l'admin au moment d'approuver un accès (défaut : consultor).
  const [nivelInicial, setNivelInicial] = useState<Record<string, Rol>>({});

  // Comptes créés mais pas encore validés (is_approved = false).
  const pendientesAcceso = users.filter((u) => !u.is_approved);
  // Demandes de montée en niveau : seulement pour les comptes déjà validés.
  const solicitudes = users.filter((u) => u.requested_status && u.is_approved);

  function run(fn: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res?.error) setError(res.error);
      router.refresh();
    });
  }

  return (
    <section className="mx-auto max-w-5xl">
      <h1 className="text-xl font-semibold tracking-tight text-[var(--text)]">Gestión de roles</h1>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        Administradores pueden ver todos los usuarios, aprobar solicitudes y cambiar el nivel de acceso.
      </p>

      {error && (
        <p className="mt-4 rounded-md bg-[var(--accent)]/10 px-3 py-2 text-sm text-[var(--accent)]">
          {error}
        </p>
      )}

      {/* Solicitudes de acceso — cuentas nuevas pendientes de validación */}
      {pendientesAcceso.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-[var(--text)]">
            Solicitudes de acceso ({pendientesAcceso.length})
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Estas cuentas fueron creadas pero todavía no tienen acceso a la plataforma.
            Elegí el nivel y aprobá el acceso.
          </p>
          <ul className="mt-2 divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-[var(--surface)]">
            {pendientesAcceso.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <span className="text-sm text-[var(--text)]">
                  <strong>{nombreCompleto(u)}</strong>
                  {u.email && nombreCompleto(u) !== u.email && (
                    <span className="text-[var(--text-muted)]"> — {u.email}</span>
                  )}
                  {u.job_title && (
                    <span className="text-[var(--text-muted)]"> · {u.job_title}</span>
                  )}
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  <select
                    value={nivelInicial[u.id] ?? "consultor"}
                    disabled={pending}
                    onChange={(e) =>
                      setNivelInicial((prev) => ({ ...prev, [u.id]: e.target.value as Rol }))
                    }
                    aria-label="Nivel de acceso a otorgar"
                    className="rounded-md border border-[var(--border)] bg-[var(--app-bg)] px-2 py-1 text-sm text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--focus)] disabled:opacity-50"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {rolLabel(r)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      run(() => adminApproveAccess(u.id, nivelInicial[u.id] ?? "consultor"))
                    }
                    className="rounded-md bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    Aprobar acceso
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Solicitudes pendientes */}
      {solicitudes.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-[var(--text)]">Solicitudes pendientes</h2>
          <ul className="mt-2 divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-[var(--surface)]">
            {solicitudes.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <span className="text-sm text-[var(--text)]">
                  <strong>{nombreCompleto(u)}</strong> solicita{" "}
                  <strong>{rolLabel(u.requested_status as Rol)}</strong>
                  <span className="text-[var(--text-muted)]"> (actual: {rolLabel(u.status)})</span>
                </span>
                <span className="flex gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => adminApproveRequest(u.id))}
                    className="rounded-md bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    Aprobar
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => adminRejectRequest(u.id))}
                    className="rounded-md border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--text)] transition-colors hover:bg-[var(--app-bg)] disabled:opacity-50"
                  >
                    Rechazar
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tabla de usuarios */}
      <div className="mt-6 overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium">Correo</th>
              <th className="px-4 py-2 font-medium">Cargo</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              <th className="px-4 py-2 font-medium">Nivel de acceso</th>
              <th className="px-4 py-2 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-2 text-[var(--text)]">
                  {nombreCompleto(u)}
                  {u.id === currentUserId && (
                    <span className="ml-2 text-xs text-[var(--text-muted)]">(vos)</span>
                  )}
                </td>
                <td className="px-4 py-2 text-[var(--text-muted)]">{u.email || "—"}</td>
                <td className="px-4 py-2 text-[var(--text-muted)]">{u.job_title || "—"}</td>
                <td className="px-4 py-2">
                  {u.is_approved ? (
                    <span className="text-xs text-[var(--text-muted)]">Activo</span>
                  ) : (
                    <span className="rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-xs font-medium text-[var(--accent)]">
                      {PENDIENTE_LABEL}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <select
                    value={u.status}
                    disabled={pending}
                    onChange={(e) => run(() => adminSetStatus(u.id, e.target.value as Rol))}
                    className="rounded-md border border-[var(--border)] bg-[var(--app-bg)] px-2 py-1 text-sm text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--focus)] disabled:opacity-50"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {rolLabel(r)}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  {u.is_approved ? (
                    u.id !== currentUserId && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => run(() => adminRevokeAccess(u.id))}
                        className="rounded-md border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--text)] transition-colors hover:bg-[var(--app-bg)] disabled:opacity-50"
                      >
                        Revocar acceso
                      </button>
                    )
                  ) : (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => adminApproveAccess(u.id, u.status))}
                      className="rounded-md bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      Aprobar acceso
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
