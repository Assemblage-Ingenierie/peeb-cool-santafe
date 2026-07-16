"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// ============================================================
// Client Supabase NAVIGATEUR (clé anon publique + cookies gérés par @supabase/ssr).
// Usage : formulaire de login (signInWithPassword), déconnexion (signOut).
// Aucune lecture de données ici : les données passent par les endpoints serveur.
// ============================================================

export function createBrowserSupabase(): SupabaseClient {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
