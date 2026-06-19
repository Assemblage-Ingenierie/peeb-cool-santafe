"use client";

import { useCallback, useState } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

/**
 * Cadre applicatif : sidebar + header + zone de contenu.
 * Gère le tiroir mobile et l'état (visuel) des filtres de composante.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [filters, setFilters] = useState<Set<string>>(() => new Set());

  const toggleFilter = useCallback((code: string) => {
    setFilters((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }, []);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      <Sidebar mobileOpen={mobileOpen} onNavigate={() => setMobileOpen(false)} />

      {/* Backdrop du tiroir mobile */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
        />
      )}

      <div className="flex min-h-screen flex-col">
        <Header
          onMenu={() => setMobileOpen(true)}
          filters={filters}
          onToggleFilter={toggleFilter}
        />
        <main className="flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
