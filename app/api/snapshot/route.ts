import { getSnapshot } from "@/lib/snapshot";

// ============================================================
// GET /api/snapshot — lecture unique Dashboard + Mapa (CDC §6).
// Lit en service_role CÔTÉ SERVEUR : seule la donnée JSON est renvoyée,
// jamais la clé. `force-dynamic` : exécution à chaque requête à l'origine
// (pas de gel au build) ; le CDN sert/revalide via l'en-tête Cache-Control.
//
// `public` est sûr ICI car le snapshot ne contient AUCUNE donnée confidentielle
// (subproyectos / metricas / fases / eventos ne sont pas des tables documentaires
// §4.4). À revoir si du contenu documentaire (publicar/confidencial) y est ajouté.
// ============================================================

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await getSnapshot();
    return Response.json(snapshot, {
      headers: {
        // stale-while-revalidate (CDC §6) : sert depuis le cache CDN, revalide
        // en arrière-plan, sans polling côté client.
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return Response.json({ error: message }, { status: 500 });
  }
}
