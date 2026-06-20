"use client";

import type { Escenario } from "@/lib/snapshot";
import { economiaKwh, economiaPct, kwhPorM2 } from "@/lib/calc";
import { fmtNumero, fmtPct } from "@/lib/format";
import { cn } from "@/lib/cn";

// Fiche Datos réutilisable (bande basse du Dashboard + future card de la page Mapa).
// Affiche consommation avant/après (kWh et kWh/m²) et la réduction (kWh et %, le % resalté).
// Présentation pure : reçoit les nombres du scénario actif + le contrôle du toggle.

const ESC_LABEL: Record<Escenario, string> = {
  faisabilidad: "Factibilidad",
  proyecto: "Proyecto",
};

interface DatosCardProps {
  antes: number | null;
  despues: number | null;
  superficie: number | null;
  escenario: Escenario;
  canToggle: boolean;
  onSelectEscenario: (e: Escenario) => void;
}

export function DatosCard({
  antes,
  despues,
  superficie,
  escenario,
  canToggle,
  onSelectEscenario,
}: DatosCardProps) {
  const redKwh = economiaKwh(antes, despues);
  const redPct = economiaPct(antes, despues);

  return (
    <div className="flex flex-col gap-3">
      {/* Toggle Factibilidad / Proyecto */}
      <div
        className="inline-flex w-fit rounded-md border border-[var(--border)] bg-[var(--app-bg)] p-0.5 text-xs"
        title={
          canToggle ? undefined : "Disponible cuando la fase « Proyecto ejecutivo » esté iniciada"
        }
      >
        {(["faisabilidad", "proyecto"] as Escenario[]).map((e) => {
          const on = escenario === e;
          return (
            <button
              key={e}
              type="button"
              aria-pressed={on}
              disabled={!canToggle}
              onClick={() => onSelectEscenario(e)}
              className={cn(
                "rounded px-2.5 py-1 font-medium transition-colors",
                on ? "bg-[var(--surface)] text-[var(--text)] shadow-sm" : "text-[var(--text-muted)]",
                !canToggle && "cursor-not-allowed opacity-60",
              )}
            >
              {ESC_LABEL[e]}
            </button>
          );
        })}
      </div>

      {/* Avant / Après */}
      <dl className="grid grid-cols-2 gap-3">
        <div>
          <dt className="text-xs text-[var(--text-muted)]">Antes</dt>
          <dd className="text-sm font-semibold text-[var(--text)]">
            {fmtNumero(antes)} <span className="text-xs font-normal text-[var(--text-muted)]">kWh</span>
          </dd>
          <dd className="text-xs text-[var(--text-muted)]">{fmtNumero(kwhPorM2(antes, superficie), 1)} kWh/m²</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--text-muted)]">Después</dt>
          <dd className="text-sm font-semibold text-[var(--text)]">
            {fmtNumero(despues)}{" "}
            <span className="text-xs font-normal text-[var(--text-muted)]">kWh</span>
          </dd>
          <dd className="text-xs text-[var(--text-muted)]">
            {fmtNumero(kwhPorM2(despues, superficie), 1)} kWh/m²
          </dd>
        </div>
      </dl>

      {/* Réduction — le % est mis en valeur (resalté) */}
      <div className="rounded-md bg-[var(--app-bg)] p-3">
        <p className="text-xs text-[var(--text-muted)]">Reducción</p>
        <p className="text-2xl font-bold leading-tight text-[var(--accent)]">{fmtPct(redPct)}</p>
        <p className="text-xs text-[var(--text-muted)]">{fmtNumero(redKwh)} kWh</p>
      </div>
    </div>
  );
}
