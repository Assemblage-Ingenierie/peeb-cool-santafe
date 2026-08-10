"use client";

import { useState } from "react";
import type { Escenario } from "@/lib/snapshot";

/**
 * État du toggle Factibilidad ⇄ Proyecto (réutilisé : bande basse + page Mapa).
 * - `canToggle` : la fase « Proyecto ejecutivo » a démarré (repère `__ini__PE` dépassé,
 *   dérivé de l'enveloppe du cronograma — cf. `faseIniciada` / `estadoFasesDe`).
 * - défaut = `proyecto` si activable ET données projet présentes, sinon `faisabilidad`.
 * - `resetKey` : change quand la sélection change → revient au défaut.
 */
export function useEscenarioToggle(
  canToggle: boolean,
  proyectoHasData: boolean,
  resetKey: string,
) {
  const defaultEsc: Escenario = canToggle && proyectoHasData ? "proyecto" : "faisabilidad";
  const [esc, setEsc] = useState<Escenario>(defaultEsc);

  // Réinitialise au défaut quand le contexte change (sélection, dispo des données
  // projet). Pattern React « ajuster l'état pendant le rendu » → évite un setState
  // dans un useEffect (règle react-hooks/set-state-in-effect) et le flash associé.
  const [contexto, setContexto] = useState({ canToggle, proyectoHasData, resetKey });
  if (
    contexto.canToggle !== canToggle ||
    contexto.proyectoHasData !== proyectoHasData ||
    contexto.resetKey !== resetKey
  ) {
    setContexto({ canToggle, proyectoHasData, resetKey });
    setEsc(defaultEsc);
  }

  const escenario: Escenario = canToggle ? esc : "faisabilidad";
  const select = (e: Escenario) => {
    if (canToggle) setEsc(e);
  };

  return { escenario, select, canToggle };
}
