"use client";

import dynamic from "next/dynamic";
import { useState, type ReactNode } from "react";
import type { SnapshotSubproyecto, SnapshotMetrica, SnapshotFase } from "@/lib/snapshot";
import { useSnapshot } from "@/components/dashboard/use-snapshot";
import { DatosCard } from "@/components/dashboard/datos-card";
import { useEscenarioToggle } from "@/components/dashboard/use-escenario";

// Carte chargée côté client uniquement (Leaflet a besoin de `window`).
const SubproyectosMap = dynamic(
  () => import("@/components/dashboard/subproyectos-map").then((m) => m.SubproyectosMap),
  {
    ssr: false,
    loading: () => <Estado>Cargando mapa…</Estado>,
  },
);

/** Page Mapa (CDC §4.2) : carte plein écran, clic sur un point → card de datos. */
export function MapaClient() {
  const snap = useSnapshot();
  const [selected, setSelected] = useState<string | null>(null);

  if (snap.status === "loading") return <Estado>Cargando mapa…</Estado>;
  if (snap.status === "error") return <Estado>No se pudo cargar el mapa.</Estado>;

  const { subproyectos, metricas, fases } = snap.data;

  return (
    <div className="mx-auto max-w-7xl">
      <h1 className="mb-3 text-xl font-semibold text-[var(--text)]">Mapa</h1>
      <SubproyectosMap
        subproyectos={subproyectos}
        selected={selected}
        onSelect={(uid) => setSelected(uid)}
        wheelZoom="always"
        heightClass="h-[calc(100vh-11rem)] min-h-[440px]"
        renderPopup={(sub) => <MarkerCard sub={sub} metricas={metricas} fases={fases} />}
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
// Factibilidad/Proyecto (désactivé tant que la fase « Proyecto ejecutivo » n'est
// pas démarrée pour ce sous-projet).
function MarkerCard({
  sub,
  metricas,
  fases,
}: {
  sub: SnapshotSubproyecto;
  metricas: SnapshotMetrica[];
  fases: SnapshotFase[];
}) {
  const fai = metricas.find((m) => m.subproyecto_uid === sub.uid && m.escenario === "faisabilidad");
  const pro = metricas.find((m) => m.subproyecto_uid === sub.uid && m.escenario === "proyecto");
  const proyEjec = fases.find(
    (f) => f.subproyecto_uid === sub.uid && f.fase === "proyecto_ejecutivo",
  );
  const canToggle = proyEjec?.estado === "en_proceso" || proyEjec?.estado === "terminado";
  const proyectoHasData = pro?.demanda_kwh != null;
  const { escenario, select } = useEscenarioToggle(canToggle, proyectoHasData, sub.uid);
  const m = escenario === "proyecto" ? pro : fai;

  return (
    <div className="w-56">
      <h3 className="mb-2 text-sm font-semibold text-[var(--text)]">{sub.nombre}</h3>
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
