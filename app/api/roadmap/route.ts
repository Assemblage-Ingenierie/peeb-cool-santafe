import { getRoadmap } from "@/lib/snapshot";

// ============================================================
// GET /api/roadmap — feuille de route + planning (Cronograma + Hojas de ruta).
// Séparé de /api/snapshot : ces tables volumineuses (~60 % du poids) ne sont
// livrées qu'aux 2 pages qui les utilisent. Lit en service_role CÔTÉ SERVEUR :
// seule la donnée JSON est renvoyée, jamais la clé.
//
// `public` est sûr ICI : le roadmap ne contient aucune donnée confidentielle
// (état d'édition des cartes + liaisons du planning, pas de contenu documentaire).
// ============================================================

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const roadmap = await getRoadmap();
    return Response.json(roadmap, {
      headers: {
        // Même politique de cache que /api/snapshot (CDC §6).
        "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return Response.json({ error: message }, { status: 500 });
  }
}
