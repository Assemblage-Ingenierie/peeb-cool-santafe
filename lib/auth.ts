// ============================================================
// lib/auth.ts — gestion minimale de l'utilisateur courant.
// 3 rôles (CDC §3.4) : admin, gestion, consultor.
// En dev : bypass via NEXT_PUBLIC_DEV_AUTH_BYPASS=true → utilisateur mock admin.
// L'auth réelle (Supabase) est branchée à l'Étape 6.
// ============================================================

export type Rol = "admin" | "gestion" | "consultor";

export interface AppUser {
  nombre: string;
  rol: Rol;
  email?: string;
}

export const DEV_AUTH_BYPASS = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "true";

const MOCK_ADMIN: AppUser = {
  nombre: "Admin (dev)",
  rol: "admin",
  email: "dev@assemblage.net",
};

/** Utilisateur courant. En dev (bypass) → mock admin ; sinon null (auth réelle = Étape 6). */
export function getCurrentUser(): AppUser | null {
  if (DEV_AUTH_BYPASS) return MOCK_ADMIN;
  return null;
}

export const isAdmin = (u: AppUser | null): boolean => u?.rol === "admin";

const ROL_LABELS: Record<Rol, string> = {
  admin: "Administrador",
  gestion: "Gestión",
  consultor: "Consultor",
};

export const rolLabel = (rol: Rol): string => ROL_LABELS[rol];
