import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Proxy Next 16 (ex-middleware) : rafraîchit la session Supabase à chaque requête.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Exécuté sur toutes les routes SAUF les assets statiques et fichiers publics.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logos|manifest|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|json)$).*)",
  ],
};
