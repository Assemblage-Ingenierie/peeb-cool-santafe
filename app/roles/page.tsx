import { isAdmin } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth-server";
import { createServerSupabase } from "@/lib/supabase/server";
import { RolesClient, type UserRow } from "@/components/roles/roles-client";

// Gestión de roles : liste des utilisateurs + attribution de rôle (admin only).
export const dynamic = "force-dynamic";

export default async function RolesPage() {
  const user = await getCurrentUser();

  if (!isAdmin(user)) {
    return (
      <section className="mx-auto max-w-2xl">
        <h1 className="text-xl font-semibold tracking-tight text-[var(--text)]">
          Gestión de roles
        </h1>
        <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-6 py-10 text-center text-sm text-[var(--text-muted)]">
          Acceso restringido a administradores.
        </div>
      </section>
    );
  }

  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("peebcoolsf_perfiles")
    .select("id, email, first_name, last_name, job_title, status, requested_status")
    .order("status", { ascending: true })
    .order("email", { ascending: true });

  return <RolesClient users={(data ?? []) as UserRow[]} currentUserId={user!.id} />;
}
