import { getRoadmap } from "@/lib/snapshot";

// ============================================================
// GET /api/roadmap — feuille de route + planning (Cronograma + Hojas de ruta).
// Séparé de /api/snapshot : ces tables volumineuses (~60 % du poids) ne sont
// livrées qu'aux 2 pages qui les utilisent. Lit avec la SESSION de l'utilisateur
// (clé anon + cookies, RLS) → cache privé `no-store` (voir /api/snapshot).
// ============================================================

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const roadmap = await getRoadmap();
    return Response.json(roadmap, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return Response.json({ error: message }, { status: 500 });
  }
}
