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

/** Récupère une fois le snapshot (réponse en cache) côté client. */
export function useSnapshot(): SnapshotState {
  const [state, setState] = useState<SnapshotState>({ status: "loading" });

  useEffect(() => {
    let alive = true;
    fetch("/api/snapshot")
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
  }, []);

  return state;
}
