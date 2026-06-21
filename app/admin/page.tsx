import { getCurrentUser, isAdmin } from "@/lib/auth";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { listTable, listSubproyectos, listMetricas, listMedidas } from "@/lib/admin/read";

// L'Admin lit/écrit les données en direct (service_role serveur), sans cache —
// jamais le snapshot caché (réservé au dashboard public, Étape 4).
export const dynamic = "force-dynamic";

export default async function AdminPage() {
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

  const [gp, equipo, entidades, eventos, capdoc, subproyectos, metricas, gestion, medidas] =
    await Promise.all([
      listTable("gp"),
      listTable("equipo"),
      listTable("entidades"),
      listTable("eventos"),
      listTable("capdoc"),
      listSubproyectos(),
      listMetricas(),
      listTable("gestion"),
      listMedidas(),
    ]);

  return (
    <section className="mx-auto max-w-6xl">
      <h1 className="text-xl font-semibold tracking-tight text-[var(--text)]">Admin</h1>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        Base de datos del proyecto. Cada fila muestra su UID al inicio para referenciarla.
      </p>
      <div className="mt-6">
        <AdminTabs
          gp={gp}
          equipo={equipo}
          entidades={entidades}
          eventos={eventos}
          capdoc={capdoc}
          subproyectos={subproyectos}
          metricas={metricas}
          gestion={gestion}
          medidas={medidas}
        />
      </div>
    </section>
  );
}
