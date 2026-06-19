import { getCurrentUser, isAdmin } from "@/lib/auth";
import { AdminTabs } from "@/components/admin/admin-tabs";

export default function AdminPage() {
  const user = getCurrentUser();

  if (!isAdmin(user)) {
    return (
      <section className="mx-auto max-w-2xl">
        <h1 className="text-xl font-semibold tracking-tight text-[var(--text)]">Admin</h1>
        <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-6 py-10 text-center text-sm text-[var(--text-muted)]">
          Acceso restringido a administradores.
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl">
      <h1 className="text-xl font-semibold tracking-tight text-[var(--text)]">Admin</h1>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        Base de datos del proyecto. Cada fila muestra su UID (copiable) para referenciarla.
      </p>
      <div className="mt-6">
        <AdminTabs />
      </div>
    </section>
  );
}
