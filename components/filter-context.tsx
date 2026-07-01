"use client";

import { createContext, useContext } from "react";
import { COMPONENTES } from "@/lib/constants";

// ============================================================
// Contexte des filtres par composante (boutons « Filtrar » du header).
// AppShell détient l'état ; les pages (Inicio, Hojas de ruta, Calendario) le
// lisent via useComponentFilters() pour n'afficher que les composantes actives.
// ============================================================

const TODAS = new Set(COMPONENTES.map((c) => c.code));

const FilterContext = createContext<Set<string> | null>(null);

export function FilterProvider({
  value,
  children,
}: {
  value: Set<string>;
  children: React.ReactNode;
}) {
  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

/** Set des composantes actives. Sans provider → toutes actives (aucun filtre). */
export function useComponentFilters(): Set<string> {
  return useContext(FilterContext) ?? TODAS;
}

/**
 * Un élément passe le filtre si sa composante est active. Les éléments SANS
 * composante (null) sont toujours affichés (non rattachés à un bouton).
 */
export function pasaFiltro(filtros: Set<string>, componente: string | null | undefined): boolean {
  return componente == null || filtros.has(componente);
}
