import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { DEV_AUTH_BYPASS, MOCK_ADMIN, type AppUser, type Rol } from "@/lib/auth";

// ============================================================
// lib/auth-server.ts — résolution de l'utilisateur courant côté SERVEUR.
// Session Supabase (cookies) → rôle depuis peebcoolsf_perfiles (autorisation
// server-side sûre ; jamais depuis user_metadata, éditable par l'utilisateur).
// Le nom d'affichage vient des métadonnées auth ou de l'email (usage non sécurité).
// ============================================================

export async function getCurrentUser(): Promise<AppUser | null> {
  // Dev local uniquement : mock admin (l'UI est admin ; les données restent
  // soumises à la RLS → vides sans vraie session Supabase).
  if (DEV_AUTH_BYPASS) return MOCK_ADMIN;

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: perfil } = await supabase
    .from("peebcoolsf_perfiles")
    .select("rol")
    .eq("user_id", user.id)
    .maybeSingle();

  // Authentifié sans profil → consultor (lecture non confidentielle uniquement).
  const rol: Rol = (perfil?.rol as Rol) ?? "consultor";

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const nombre =
    (typeof meta.nombre === "string" && meta.nombre) ||
    (typeof meta.full_name === "string" && meta.full_name) ||
    user.email ||
    "Usuario";

  return { nombre, rol, email: user.email ?? undefined };
}
