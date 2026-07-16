import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// ============================================================
// proxy.ts (Next.js 16 — ex-middleware.ts). Rafraîchit la session Supabase à
// chaque requête et protège les routes (redirige les non-authentifiés vers /login).
// Runtime Node.js par défaut en Next 16 (compatible @supabase/ssr).
// ============================================================

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Toutes les routes sauf : fichiers statiques Next, optimisation d'images,
     * favicon et assets d'images (logos, etc.). On NE PAS exclut /api : la session
     * doit y être rafraîchie (la protection des /api est laissée à la RLS).
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
