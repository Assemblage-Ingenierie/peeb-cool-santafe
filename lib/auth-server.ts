import "server-only";
import { DEV_AUTH_BYPASS, MOCK_ADMIN, ROLES, type AppUser, type Rol } from "./auth";
import { SUPABASE_AUTH_CONFIGURED } from "./supabase/config";
import { createAuthServerClient } from "./supabase/server-auth";

// ============================================================
// Résolution SERVEUR de l'utilisateur courant depuis la session Supabase.
//  • dev (bypass)         → mock admin ;
//  • Supabase non configuré → null (site en lecture publique seule) ;
//  • session valide       → { nombre, rol, email }, rôle lu dans peebcoolsf_perfiles.
//
// Le rôle vient TOUJOURS de la table perfiles (jamais de user_metadata, qui est
// modifiable par l'utilisateur → jamais fiable pour une décision d'autorisation).
// ============================================================

export async function getCurrentUser(): Promise<AppUser | null> {
  if (DEV_AUTH_BYPASS) return MOCK_ADMIN;
  if (!SUPABASE_AUTH_CONFIGURED) return null;

  const supabase = await createAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // RLS perfiles_sel : l'utilisateur peut lire sa propre ligne (auth.uid() = user_id).
  const { data: perfil } = await supabase
    .from("peebcoolsf_perfiles")
    .select("rol")
    .eq("user_id", user.id)
    .maybeSingle();

  const rol: Rol = ROLES.includes(perfil?.rol as Rol) ? (perfil!.rol as Rol) : "consultor";
  const nombre =
    (typeof user.user_metadata?.nombre === "string" && user.user_metadata.nombre) ||
    user.email ||
    "Usuario";

  return { nombre, rol, email: user.email ?? undefined };
}

/** Garde-fou serveur : lève « No autorizado » si l'utilisateur n'est pas admin. */
export async function requireAdmin(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user || user.rol !== "admin") throw new Error("No autorizado");
  return user;
}
