// ============================================================
// Clés PUBLIQUES Supabase (exposées au navigateur) : URL + clé publishable
// (ou anon en repli). Utilisées par le client lié à la session (server-auth,
// proxy). La clé service_role reste server-only dans lib/supabase/server.ts.
// ============================================================

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

// Supabase recommande désormais la clé « publishable » (sb_publishable_…) ;
// on accepte l'ancienne clé « anon » en repli pour ne pas casser l'existant.
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

// L'auth réelle n'est active que si l'URL et la clé publique sont définies.
// Sinon (build non configuré) : aucune session, tout retombe sur la lecture publique.
export const SUPABASE_AUTH_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
