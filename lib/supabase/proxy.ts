import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEV_AUTH_BYPASS } from "@/lib/auth";
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_AUTH_CONFIGURED } from "./config";

// ============================================================
// Rafraîchit la session Supabase (cookies) à chaque requête et propage les
// cookies mis à jour au Server Component ET au navigateur. Appelé par proxy.ts
// (ex-« middleware », renommé Proxy dans Next 16).
//
// No-op si Supabase n'est pas configuré ou si le bypass dev est actif.
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

  await supabase.auth.getUser();

  return response;
}
