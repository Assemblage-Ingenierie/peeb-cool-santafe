"use client";

import { useEffect, useState } from "react";
import type { Roadmap } from "@/lib/snapshot";

// Feuille de route + planning via l'endpoint dédié /api/roadmap. Consommé
// UNIQUEMENT par le Cronograma et les Hojas de ruta (les autres pages n'en ont
// pas l'usage → elles ne le téléchargent pas). Même schéma que useSnapshot.
// `import type` : le type vient d'un module `server-only` mais est effacé à la
// compilation → aucune fuite de la clé service_role côté client.

export type RoadmapState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: Roadmap };

/**
 * Récupère le roadmap côté client. `refreshKey` : incrémenter pour forcer un
 * rechargement après une écriture (contourne le cache HTTP/CDN).
 */
export function useRoadmap(refreshKey = 0): RoadmapState {
  const [state, setState] = useState<RoadmapState>({ status: "loading" });

  useEffect(() => {
    let alive = true;
    const url = refreshKey > 0 ? `/api/roadmap?t=${refreshKey}` : "/api/roadmap";
    const init: RequestInit | undefined = refreshKey > 0 ? { cache: "no-store" } : undefined;
    fetch(url, init)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as Roadmap;
      })
      .then((data) => {
        if (alive) setState({ status: "ready", data });
      })
      .catch((e: unknown) => {
        if (alive) {
          setState({
            status: "error",
            message: e instanceof Error ? e.message : "Error desconocido",
          });
        }
      });
    return () => {
      alive = false;
    };
  }, [refreshKey]);

  return state;
}
