"use client";

import { useEffect, useState } from "react";
import type { Snapshot } from "@/lib/snapshot";

// Lecture publique (Dashboard + Mapa) via l'endpoint unique /api/snapshot.
// `import type` : les types viennent d'un module `server-only` mais sont effacés
// à la compilation → aucune fuite de la clé service_role côté client.

export type SnapshotState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: Snapshot };

/**
 * Récupère le snapshot côté client. `refreshKey` : incrémenter pour forcer un
 * rechargement après une écriture (ex. création/édition d'un evento) — la requête
 * contourne alors le cache HTTP/CDN. La donnée courante reste affichée pendant le
 * rechargement (pas de retour à « Cargando… »).
 */
export function useSnapshot(refreshKey = 0): SnapshotState {
  const [state, setState] = useState<SnapshotState>({ status: "loading" });

  useEffect(() => {
    let alive = true;
    const url = refreshKey > 0 ? `/api/snapshot?t=${refreshKey}` : "/api/snapshot";
    const init: RequestInit | undefined = refreshKey > 0 ? { cache: "no-store" } : undefined;
    fetch(url, init)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as Snapshot;
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
