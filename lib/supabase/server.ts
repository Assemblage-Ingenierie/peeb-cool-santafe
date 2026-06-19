import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ============================================================
// Client Supabase SERVEUR en service_role (bypass RLS).
// JAMAIS importé côté client : `server-only` casse le build si c'est le cas,
// et la clé est lue depuis SUPABASE_SERVICE_ROLE_KEY (sans NEXT_PUBLIC_).
// Usage : Server Components (lecture) + Server Actions (écriture) de l'Admin.
// L'Admin lit/écrit table par table SANS cache (pas le snapshot de l'Étape 4).
// ============================================================

export function createServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Configuración Supabase incompleta: definir NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local.",
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
