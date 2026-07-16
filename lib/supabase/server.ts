import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// ============================================================
// Client Supabase SERVEUR lié à la SESSION de l'utilisateur (clé anon + cookies).
// La RLS s'applique avec le contexte de l'appelant (authenticated / rôle via
// peebcoolsf_perfiles). Plus de service_role : aucune clé secrète côté serveur.
// Usage : Server Components (lecture), Server Actions (écriture), Route Handlers.
// ============================================================

export async function createServerSupabase(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Configuración Supabase incompleta: definir NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Appelé depuis un Server Component : les cookies sont en lecture seule
          // ici. Le rafraîchissement de session est assuré par proxy.ts.
        }
      },
    },
  });
}
