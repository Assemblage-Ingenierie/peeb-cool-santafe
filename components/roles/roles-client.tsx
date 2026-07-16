"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { rolLabel, type Rol } from "@/lib/auth";
import { adminSetStatus, adminApproveRequest, adminRejectRequest } from "@/app/roles/actions";

export interface UserRow {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  job_title: string | null;
  status: Rol;
  requested_status: "gestion" | "admin" | null;
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

  const solicitudes = users.filter((u) => u.requested_status);

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
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium">Correo</th>
              <th className="px-4 py-2 font-medium">Cargo</th>
              <th className="px-4 py-2 font-medium">Nivel de acceso</th>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
