import { getSnapshot } from "@/lib/snapshot";

// ============================================================
// GET /api/snapshot — lecture unique Dashboard + Mapa (CDC §6).
// Lit avec la SESSION de l'utilisateur (clé anon + cookies, RLS). La réponse
// dépend du rôle (filtrage confidentiel) → cache PRIVÉ non partagé : `no-store`
// pour éviter qu'un cache CDN serve la vue d'un utilisateur à un autre.
// `force-dynamic` : exécution à chaque requête à l'origine.
// ============================================================

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await getSnapshot();
    return Response.json(snapshot, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return Response.json({ error: message }, { status: 500 });
  }
}
