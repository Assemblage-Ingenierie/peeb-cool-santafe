import { isAdmin } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth-server";
import { createServerSupabase } from "@/lib/supabase/server";
import { NotasClient } from "@/components/notas/notas-client";
import type { NotaRow } from "./actions";

// Notas — whiteboard admin (post-its libres). Lecture via session utilisateur
// (RLS admin only). force-dynamic : pas de cache.
export const dynamic = "force-dynamic";

export default async function NotasPage() {
  const user = await getCurrentUser();
  if (!isAdmin(user)) {
    return (
      <section className="mx-auto max-w-2xl">
        <h1 className="text-xl font-semibold tracking-tight text-[var(--text)]">Notas</h1>
        <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-6 py-10 text-center text-sm text-[var(--text-muted)]">
          Acceso restringido a administradores.
        </div>
      </section>
    );
  }

  const sb = await createServerSupabase();
  const { data } = await sb
    .from("peebcoolsf_notas")
    .select("id, titulo, contenido, color, x, y")
    .order("creado_en", { ascending: true });

  return <NotasClient initial={(data ?? []) as NotaRow[]} />;
}
