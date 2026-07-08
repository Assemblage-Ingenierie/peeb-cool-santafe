// ============================================================
// lib/auth.ts — modèle utilisateur PARTAGÉ (client + serveur), sans aucune
// dépendance serveur → importable partout. 3 rôles (CDC §3.4).
//
//  • Résolution serveur (session Supabase, cookies) : lib/auth-server.ts.
//  • Accès dans un composant client : useCurrentUser() (components/auth-context).
//
// En dev : bypass via NEXT_PUBLIC_DEV_AUTH_BYPASS=true → utilisateur mock admin.
// ============================================================

export type Rol = "admin" | "gestion" | "consultor";

export interface AppUser {
  nombre: string;
  rol: Rol;
  email?: string;
}

export const DEV_AUTH_BYPASS = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "true";

/** Utilisateur fictif renvoyé en dev quand le bypass est actif. */
export const MOCK_ADMIN: AppUser = {
  nombre: "Admin (dev)",
  rol: "admin",
  email: "dev@assemblage.net",
};

export const ROLES: readonly Rol[] = ["admin", "gestion", "consultor"];

export const isAdmin = (u: AppUser | null): boolean => u?.rol === "admin";

const ROL_LABELS: Record<Rol, string> = {
  admin: "Administrador",
  gestion: "Gestión",
  consultor: "Consultor",
};

export const rolLabel = (rol: Rol): string => ROL_LABELS[rol];
