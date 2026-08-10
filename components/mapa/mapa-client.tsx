"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, type ReactNode } from "react";
import type { SnapshotSubproyecto, SnapshotMetrica } from "@/lib/snapshot";
import { TIPOLOGIAS } from "@/lib/constants";
import { economiaPct } from "@/lib/calc";
import { fmtNumero, fmtPct } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useSnapshot } from "@/components/dashboard/use-snapshot";
import { useRoadmap } from "@/components/dashboard/use-roadmap";
import { estadoFasesDe, faseIniciada } from "@/lib/fases-actuales";
import { DatosCard } from "@/components/dashboard/datos-card";
import { useEscenarioToggle } from "@/components/dashboard/use-escenario";

// Carte chargée côté client uniquement (Leaflet a besoin de `window`).
const SubproyectosMap = dynamic(
  () => import("@/components/dashboard/subproyectos-map").then((m) => m.SubproyectosMap),
  { ssr: false, loading: () => <Estado>Cargando mapa…</Estado> },
);

// Cadre par défaut : Province de Santa Fe (vue sur toute sa hauteur).
const SANTA_FE_BOUNDS: [[number, number], [number, number]] = [
  [-34.0, -62.9],
  [-28.0, -58.7],
];

const TIPO_OPCIONES: { key: string; label: string }[] = [
  { key: "todos", label: "Todos" },
  ...TIPOLOGIAS.map((t) => ({ key: t.code, label: t.nombre })),
];

/** Page Mapa (CDC §4.2) : carte plein écran, filtre par typologie, % optionnel, card au clic. */
export function MapaClient() {
  const snap = useSnapshot();
  const rm = useRoadmap();
  const [selected, setSelected] = useState<string | null>(null);
  const [tipo, setTipo] = useState<string>("todos");
  const [showPct, setShowPct] = useState(false);
  // « hoy » posé côté client uniquement (anti-décalage d'hydratation).
  const [hoyMs, setHoyMs] = useState<number | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- init client-only (1×)
  useEffect(() => setHoyMs(Date.now()), []);

  if (snap.status === "loading") return <Estado>Cargando mapa…</Estado>;
  if (snap.status === "error") return <Estado>No se pudo cargar el mapa.</Estado>;

  const { subproyectos, metricas } = snap.data;

  // « Proyecto ejecutivo iniciado » (repère `__ini__PE` dépassé) → active le toggle
  // Factibilidad/Proyecto. DÉRIVÉ du modèle enveloppe, plus d'`estado` stocké.
  // Faux tant que le roadmap n'est pas chargé (toggle désactivé).
  const peIniciado = (sub: SnapshotSubproyecto): boolean =>
    rm.status === "ready" &&
    hoyMs != null &&
    faseIniciada(estadoFasesDe(rm.data, sub.uid, sub.tipologia, hoyMs).get("proyecto_ejecutivo"));
  const lista = tipo === "todos" ? subproyectos : subproyectos.filter((s) => s.tipologia === tipo);

  // % de réduction (escenario factibilidad) pour l'étiquette permanente.
  const pctFor = (sub: SnapshotSubproyecto) => {
    const m = metricas.find((x) => x.subproyecto_uid === sub.uid && x.escenario === "faisabilidad");
    return economiaPct(m?.demanda_kwh ?? null, m?.demanda_despues_kwh ?? null);
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col">
      <h1 className="mb-3 text-xl font-semibold text-[var(--text)]">Mapa</h1>

      {/* Filtre par typologie + affichage du % de réduction sur les points */}
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex flex-wrap gap-1">
          {TIPO_OPCIONES.map((o) => {
            const on = tipo === o.key;
            return (
              <button
                key={o.key}
                type="button"
                aria-pressed={on}
                onClick={() => setTipo(o.key)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  on
                    ? "bg-[var(--surface)] font-medium text-[var(--text)] shadow-sm ring-1 ring-[var(--border)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]",
                )}
              >
                {o.label}
              </button>
            );
          })}
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text)]">
          <input
            type="checkbox"
            checked={showPct}
            onChange={(e) => setShowPct(e.target.checked)}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          Mostrar % de reducción
        </label>
      </div>

      <SubproyectosMap
        subproyectos={lista}
        selected={selected}
        onSelect={(uid) => setSelected(uid)}
        wheelZoom="always"
        heightClass="h-[calc(100vh-13rem)] min-h-[420px]"
        initialBounds={SANTA_FE_BOUNDS}
        renderTooltip={(sub) =>
          showPct
            ? { text: fmtPct(pctFor(sub)), permanent: true }
            : { text: sub.nombre, permanent: false }
        }
        renderPopup={(sub) => <MarkerCard sub={sub} metricas={metricas} peIniciado={peIniciado(sub)} />}
      />
    </div>
  );
}

function Estado({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[60vh] items-center justify-center text-sm text-[var(--text-muted)]">
      {children}
    </div>
  );
}

// Fiche au clic : consommations avant/après + réduction (DatosCard) + toggle
// Factibilidad/Proyecto (désactivé tant que la fase « Proyecto ejecutivo » n'a pas
// démarré pour ce sous-projet — `peIniciado`, dérivé du modèle enveloppe).
function MarkerCard({
  sub,
  metricas,
  peIniciado,
}: {
  sub: SnapshotSubproyecto;
  metricas: SnapshotMetrica[];
  peIniciado: boolean; // fase « Proyecto ejecutivo » démarrée (dérivé de l'enveloppe)
}) {
  const fai = metricas.find((m) => m.subproyecto_uid === sub.uid && m.escenario === "faisabilidad");
  const pro = metricas.find((m) => m.subproyecto_uid === sub.uid && m.escenario === "proyecto");
  const canToggle = peIniciado;
  const proyectoHasData = pro?.demanda_kwh != null;
  const { escenario, select } = useEscenarioToggle(canToggle, proyectoHasData, sub.uid);
  const m = escenario === "proyecto" ? pro : fai;

  return (
    <div className="w-56">
      <h3 className="text-sm font-semibold text-[var(--text)]">{sub.nombre}</h3>
      {/* Datos del edificio (<div>, pas <p> : Leaflet marge les <p> des popups) */}
      <div className="mb-2 mt-1 space-y-0.5 text-xs text-[var(--text-muted)]">
        {sub.direccion && <div>{sub.direccion}</div>}
        <div>
          Superficie:{" "}
          <span className="font-medium text-[var(--text)]">{fmtNumero(sub.superficie_m2)} m²</span>
        </div>
      </div>
      <DatosCard
        antes={m?.demanda_kwh ?? null}
        despues={m?.demanda_despues_kwh ?? null}
        superficie={sub.superficie_m2}
        escenario={escenario}
        canToggle={canToggle}
        onSelectEscenario={select}
      />
    </div>
  );
}
