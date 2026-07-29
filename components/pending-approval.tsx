"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { LogoSlot } from "@/components/logo-slot";

// ============================================================
// Écran d'attente : compte créé mais accès pas encore validé par un
// administrateur (peebcoolsf_perfiles.is_approved = false). Rendu à la place
// de l'AppShell par app/layout.tsx, quelle que soit la route demandée.
// Le rempart réel reste la RLS (policy restrictive `req_aprobacion`).
// ============================================================

export function PendingApproval({ email }: { email?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Recharge le rendu serveur : si l'admin vient de valider, l'app s'ouvre.
  function verificar() {
    setLoading(true);
    router.refresh();
    // Le refresh est asynchrone côté serveur ; on rend le bouton à l'utilisateur.
    setTimeout(() => setLoading(false), 1500);
  }

  async function cerrarSesion() {
    await createBrowserSupabase().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] px-4">
      <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-sm">
        <div className="mb-6 flex justify-center">
          <LogoSlot
            src="/logos/assemblage.png"
            file="assemblage.png"
            alt="Assemblage ingeniería"
            className="h-10 w-auto"
          />
        </div>

        <h1 className="text-lg font-semibold tracking-tight text-[var(--text)]">
          Solicitud de acceso pendiente
        </h1>

        <p className="mt-3 text-sm text-[var(--text-muted)]">
          Tu cuenta fue creada correctamente, pero todavía necesita la validación de un
          administrador para acceder a la plataforma PEEB Cool — Santa Fe.
        </p>

        {email && (
          <p className="mt-4 rounded-md bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--text)]">
            {email}
          </p>
        )}

        <p className="mt-4 text-sm text-[var(--text-muted)]">
          Recibirás acceso en cuanto tu solicitud sea aprobada. Si es urgente, contactá al
          equipo del proyecto.
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={verificar}
            disabled={loading}
            className="w-full rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Verificando…" : "Verificar de nuevo"}
          </button>
          <button
            type="button"
            onClick={cerrarSesion}
            className="w-full rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--app-bg)]"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
