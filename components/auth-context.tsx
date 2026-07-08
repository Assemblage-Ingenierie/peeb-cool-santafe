"use client";

// ============================================================
// Contexte d'auth CÔTÉ CLIENT. L'utilisateur est résolu UNE fois côté serveur
// (root layout → lib/auth-server) et injecté ici : les composants client
// (sidebar, badges, édition Hojas de ruta) lisent le rôle sans re-fetch.
// ============================================================

import { createContext, useContext } from "react";
import type { AppUser } from "@/lib/auth";

const AuthContext = createContext<AppUser | null>(null);

export function AuthProvider({
  user,
  children,
}: {
  user: AppUser | null;
  children: React.ReactNode;
}) {
  return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>;
}

/** Utilisateur courant dans un composant client (null si non connecté). */
export function useCurrentUser(): AppUser | null {
  return useContext(AuthContext);
}
