import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { DEV_AUTH_BYPASS } from "@/lib/auth";

// ============================================================
// Client Supabase SERVEUR lié à la SESSION de l'utilisateur (clé anon + cookies).
// La RLS s'applique avec le contexte de l'appelant (authenticated / rôle via
// peebcoolsf_perfiles). Aucune clé secrète exposée au navigateur.
// Usage : Server Components (lecture), Server Actions (écriture), Route Handlers.
//
// DEV (NEXT_PUBLIC_DEV_AUTH_BYPASS=true) : on lit/écrit via service_role pour
// développer SANS connexion (la RLS est contournée, comme l'ancien snapshot).
// STRICTEMENT dev — en production le flag est faux → clé anon + session.
// ============================================================

export async function createServerSupabase(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Configuración Supabase incompleta: definir NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  // Bypass dev : service_role (RLS contournée). Jamais atteint en production.
  if (DEV_AUTH_BYPASS) {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceKey) {
      return createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    }
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
