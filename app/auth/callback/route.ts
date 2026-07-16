import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

// ============================================================
// Callback OAuth (Google) — échange le code PKCE contre une session (cookies).
// Route publique (le proxy laisse passer /auth/*). Redirige ensuite vers `next`.
// ============================================================

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/";

  if (code) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Derrière Vercel, préférer l'hôte d'origine transmis par le proxy.
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocal = process.env.NODE_ENV === "development";
      const base = isLocal || !forwardedHost ? origin : `https://${forwardedHost}`;
      return NextResponse.redirect(`${base}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
