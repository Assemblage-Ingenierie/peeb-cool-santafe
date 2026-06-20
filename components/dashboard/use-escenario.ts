"use client";

import { useEffect, useState } from "react";
import type { Escenario } from "@/lib/snapshot";

/**
 * État du toggle Factibilidad ⇄ Proyecto (réutilisé : bande basse + page Mapa).
 * - `canToggle` : la fase « Proyecto ejecutivo » est démarrée (en_proceso OU terminado).
 * - défaut = `proyecto` si activable ET données projet présentes, sinon `faisabilidad`.
 * - `resetKey` : change quand la sélection change → revient au défaut.
 */
export function useEscenarioToggle(
  canToggle: boolean,
  proyectoHasData: boolean,
  resetKey: string,
) {
  const [esc, setEsc] = useState<Escenario>("faisabilidad");

  useEffect(() => {
    setEsc(canToggle && proyectoHasData ? "proyecto" : "faisabilidad");
  }, [canToggle, proyectoHasData, resetKey]);

  const escenario: Escenario = canToggle ? esc : "faisabilidad";
  const select = (e: Escenario) => {
    if (canToggle) setEsc(e);
  };

  return { escenario, select, canToggle };
}
