// ============================================================
// lib/auth.ts — types + helpers d'utilisateur, ISOMORPHE (client + serveur).
// 3 rôles (CDC §3.4) : admin, gestion, consultor.
// Ne contient AUCUN accès session/DB (server-only) → importable côté client.
// La résolution de la session réelle vit dans lib/auth-server.ts (getCurrentUser).
// Côté client, l'utilisateur est fourni par le contexte (components/auth-context).
// ============================================================

export type Rol = "admin" | "gestion" | "consultor";

/** Statut demandé pour une montée en niveau (workflow de demande de rôle). */
export type RequestedStatus = "gestion" | "admin" | null;

export interface AppUser {
  id: string; // uid auth (= peebcoolsf_perfiles.id)
  nombre: string;
  rol: Rol;
  email?: string;
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  requestedStatus?: RequestedStatus;
}

/** Bypass d'auth en développement local (mock admin). JAMAIS activé en prod. */
export const DEV_AUTH_BYPASS = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "true";

export const MOCK_ADMIN: AppUser = {
  id: "00000000-0000-0000-0000-000000000000",
  nombre: "Admin (dev)",
  rol: "admin",
  email: "dev@assemblage.net",
};

export const isAdmin = (u: AppUser | null): boolean => u?.rol === "admin";

const ROL_LABELS: Record<Rol, string> = {
  admin: "Administrador",
  gestion: "Gestión",
  consultor: "Consultor",
};

export const rolLabel = (rol: Rol): string => ROL_LABELS[rol];
