"use client";

import { useCallback, useState } from "react";
import { COMPONENTES } from "@/lib/constants";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { FilterProvider } from "./filter-context";

/**
 * Cadre applicatif : sidebar + header + zone de contenu.
 * Gère le tiroir mobile et l'état (visuel) des filtres de composante.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  // Vista / Rol : le Set des composantes visibles.
  //  • GP = « Todo » (réinitialise → tout visible). Actif par défaut.
  //  • EE / AyS / G : vue d'une (ou plusieurs) composante(s). Depuis « Todo »,
  //    un clic passe à cette composante seule ; sinon on ajoute/retire ; vide → Todo.
  const [filters, setFilters] = useState<Set<string>>(
    () => new Set(COMPONENTES.map((c) => c.code)),
  );

  const toggleFilter = useCallback((code: string) => {
    setFilters((prev) => {
      const todas = COMPONENTES.map((c) => c.code);
      if (code === "GP") return new Set(todas); // GP = reset → todo visible
      const esTodo = prev.size === todas.length;
      const next = esTodo ? new Set<string>([code]) : new Set(prev);
      if (!esTodo) {
        if (next.has(code)) next.delete(code);
        else next.add(code);
      }
      return next.size === 0 ? new Set(todas) : next;
    });
  }, []);

  return (
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
  );
}
