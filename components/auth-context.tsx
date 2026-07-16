"use client";

import { createContext, useContext } from "react";
import type { AppUser } from "@/lib/auth";

// ============================================================
// Contexte d'auth CLIENT : l'utilisateur est résolu côté serveur (app/layout.tsx
// via getCurrentUser) puis fourni ici. Les composants client lisent useAuthUser()
// au lieu d'appeler une résolution de session (impossible en synchrone au navigateur).
// ============================================================

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

export function useAuthUser(): AppUser | null {
  return useContext(AuthContext);
}
