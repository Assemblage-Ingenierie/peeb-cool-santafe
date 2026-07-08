import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

// ============================================================
// Client Supabase SERVEUR lié à la SESSION (cookies) → respecte la RLS et porte
// l'identité de l'utilisateur connecté (auth.uid()).
//
// À NE PAS confondre avec createServiceClient (lib/supabase/server.ts) : celui-là
// est en service_role et contourne la RLS (lecture publique + écritures admin).
// Celui-ci sert à : connexion/déconnexion et lecture du profil de l'utilisateur.
// ============================================================

export async function createAuthServerClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Appelé depuis un Server Component (cookies en lecture seule) :
          // le rafraîchissement des cookies de session est assuré par proxy.ts.
        }
      },
    },
  });
}
