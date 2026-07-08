import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEV_AUTH_BYPASS } from "@/lib/auth";
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_AUTH_CONFIGURED } from "./config";

// ============================================================
// 1) Rafraîchit la session Supabase (cookies) à chaque requête et propage les
//    cookies mis à jour au Server Component ET au navigateur.
// 2) MUR D'AUTHENTIFICATION : rien n'est visible sans être connecté. Toute
//    requête sans session est redirigée vers /login (les routes /api renvoient 401).
//
// No-op si Supabase n'est pas configuré ou si le bypass dev est actif
// (en local, bypass = mock admin → tout est visible sans login).
// ⚠ Ne rien insérer entre createServerClient et getUser() (contrainte @supabase/ssr).
// ============================================================

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  if (!SUPABASE_AUTH_CONFIGURED || DEV_AUTH_BYPASS) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const enLogin = pathname === "/login";

  // Non connecté → tout est fermé sauf la page de login.
  if (!user && !enLogin) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Déjà connecté et sur /login → renvoyer à l'accueil.
  if (user && enLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    const redirect = NextResponse.redirect(url);
    for (const c of response.cookies.getAll()) redirect.cookies.set(c);
    return redirect;
  }

  return response;
}
