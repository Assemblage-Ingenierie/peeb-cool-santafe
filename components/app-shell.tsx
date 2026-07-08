"use client";

import { useCallback, useState } from "react";
import { usePathname } from "next/navigation";
import { COMPONENTES } from "@/lib/constants";
import type { AppUser } from "@/lib/auth";
import { AuthProvider } from "./auth-context";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { FilterProvider } from "./filter-context";

/**
 * Cadre applicatif : sidebar + header + zone de contenu.
 * Gère le tiroir mobile et l'état (visuel) des filtres de composante.
 * `user` : session résolue côté serveur (root layout) → contexte d'auth client.
 */
export function AppShell({
  user,
  children,
}: {
  user: AppUser | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  // Vista / Rol : le Set des composantes visibles.
  //  • GP = « Todo » (réinitialise → tout visible). Actif par défaut.
  //  • EE / AyS / G : vue d'une (ou plusieurs) composante(s). Depuis « Todo »,
  //    un clic passe à cette composante seule ; sinon on ajoute/retire ; vide → Todo.
  const [filters, setFilters] = useState<Set<string>>(
    () => new Set(COMPONENTES.map((c) => c.code)),
  );

  // Sélection unique : GP = « Todo » (tout visible) ; une composante = elle seule.
  const toggleFilter = useCallback((code: string) => {
    setFilters(() =>
      code === "GP" ? new Set(COMPONENTES.map((c) => c.code)) : new Set([code]),
    );
  }, []);

  // Page de connexion : plein écran, sans sidebar ni header.
  if (pathname === "/login") {
    return <AuthProvider user={user}>{children}</AuthProvider>;
  }

  return (
    <AuthProvider user={user}>
      <div className="min-h-screen lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
        <Sidebar mobileOpen={mobileOpen} onNavigate={() => setMobileOpen(false)} />

        {/* Backdrop du tiroir mobile */}
        {mobileOpen && (
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          />
        )}

        {/* min-w-0 : autorise la colonne de contenu à rétrécir (sinon le tableau large
            et l'agenda débordent et chevauchent la sidebar quand la fenêtre est réduite). */}
        <div className="flex min-h-screen min-w-0 flex-col">
          <Header
            onMenu={() => setMobileOpen(true)}
            filters={filters}
            onToggleFilter={toggleFilter}
          />
          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6">
            <FilterProvider value={filters}>{children}</FilterProvider>
          </main>
        </div>
      </div>
    </AuthProvider>
  );
}
