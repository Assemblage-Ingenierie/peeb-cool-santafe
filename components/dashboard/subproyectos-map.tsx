"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from "react-leaflet";
import type { LatLngTuple } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { SnapshotSubproyecto } from "@/lib/snapshot";
import { getTipologia, UI } from "@/lib/constants";

// Carte de SÉLECTION (Dashboard) — tuiles OSM directes (CDC §6), un point par
// sous-projet coloré selon la typologie (A/H/E). Le clic sélectionne le sous-projet
// (état partagé avec le tableau). PAS de card de données ici → c'est la page Mapa (4.2).

interface SubproyectosMapProps {
  subproyectos: SnapshotSubproyecto[]; // déjà filtrés par typologie
  selected: string | null;
  onSelect: (uid: string) => void;
  /**
   * Comportement de la molette :
   * - "ctrl" (défaut) : zoom seulement avec Ctrl enfoncé (la molette seule fait
   *   défiler la page) — adapté à la carte intégrée d'Inicio.
   * - "always" : zoom libre à la molette — pour la page Mapa (plein écran).
   */
  wheelZoom?: "ctrl" | "always";
}

// Recadre la vue sur les points affichés.
function FitBounds({ points }: { points: LatLngTuple[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 13);
    } else {
      map.fitBounds(points, { padding: [30, 30], maxZoom: 13 });
    }
  }, [map, points]);
  return null;
}

// Zoom à la molette uniquement quand Ctrl est enfoncé ; relâché, la molette
// redonne le défilement de la page (carte intégrée dans une page scrollable).
function CtrlWheelZoom() {
  const map = useMap();
  useEffect(() => {
    const enable = (e: KeyboardEvent) => {
      if (e.key === "Control") map.scrollWheelZoom.enable();
    };
    const disable = (e: KeyboardEvent) => {
      if (e.key === "Control") map.scrollWheelZoom.disable();
    };
    const off = () => map.scrollWheelZoom.disable();
    window.addEventListener("keydown", enable);
    window.addEventListener("keyup", disable);
    window.addEventListener("blur", off);
    return () => {
      window.removeEventListener("keydown", enable);
      window.removeEventListener("keyup", disable);
      window.removeEventListener("blur", off);
    };
  }, [map]);
  return null;
}

export function SubproyectosMap({
  subproyectos,
  selected,
  onSelect,
  wheelZoom = "ctrl",
}: SubproyectosMapProps) {
  const puntos = useMemo(
    () => subproyectos.filter((s) => s.lat != null && s.lng != null),
    [subproyectos],
  );
  const coords = useMemo<LatLngTuple[]>(
    () => puntos.map((s) => [s.lat as number, s.lng as number]),
    [puntos],
  );

  // Centre par défaut : Province de Santa Fe (si aucun point).
  const center: LatLngTuple = coords[0] ?? [-31.6, -60.7];

  return (
    <MapContainer
      center={center}
      zoom={7}
      scrollWheelZoom={wheelZoom === "always"}
      className="h-[320px] w-full rounded-md"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds points={coords} />
      {wheelZoom === "ctrl" && <CtrlWheelZoom />}
      {puntos.map((s) => {
        const tp = getTipologia(s.tipologia);
        const sel = s.uid === selected;
        const color = tp?.color ?? UI.textMuted;
        return (
          <CircleMarker
            key={s.uid}
            center={[s.lat as number, s.lng as number]}
            radius={sel ? 11 : 7}
            pathOptions={{
              // Sélection mise en valeur : anneau clair + trait plus épais.
              color: sel ? UI.surface : color,
              weight: sel ? 3 : 1.5,
              fillColor: color,
              fillOpacity: 1,
            }}
            eventHandlers={{ click: () => onSelect(s.uid) }}
          >
            <Tooltip>{s.nombre}</Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
