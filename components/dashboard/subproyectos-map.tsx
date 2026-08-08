"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup, useMap } from "react-leaflet";
import type { LatLngTuple, LatLngBoundsExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { SnapshotSubproyecto } from "@/lib/snapshot";
import { getTipologia, UI } from "@/lib/constants";
import { cn } from "@/lib/cn";

// Carte OSM réutilisable (tuiles directes, CDC §6) : un point par sous-projet
// coloré selon la typologie (A/H/E).
// - Dashboard (Inicio) : sélection seule (zoom Ctrl), cadrage sur les points.
// - Page Mapa : zoom libre, cadrage initial fixe (province), fiche au clic,
//   étiquette personnalisable (nom au survol ou % permanent).

interface SubproyectosMapProps {
  subproyectos: SnapshotSubproyecto[]; // déjà filtrés
  selected: string | null;
  onSelect?: (uid: string) => void;
  /** "ctrl" (défaut) = zoom seulement avec Ctrl ; "always" = zoom libre (page Mapa). */
  wheelZoom?: "ctrl" | "always";
  /** Hauteur du conteneur (classe Tailwind). Défaut : encart d'Inicio. */
  heightClass?: string;
  /** Si fourni, une popup (card) s'ouvre au clic sur le point. */
  renderPopup?: (sub: SnapshotSubproyecto) => ReactNode;
  /** Cadre initial fixe (ex. Province de Santa Fe). Sinon, ajuste sur les points. */
  initialBounds?: LatLngBoundsExpression;
  /** Personnalise l'étiquette du point (défaut : nom au survol). */
  renderTooltip?: (sub: SnapshotSubproyecto) => { text: ReactNode; permanent: boolean };
}

// Cadre la vue : soit un cadre initial fixe (une seule fois), soit les points.
function FitBounds({
  points,
  initialBounds,
}: {
  points: LatLngTuple[];
  initialBounds?: LatLngBoundsExpression;
}) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    // rAF + invalidateSize : le conteneur (hauteur en calc()) peut ne pas être
    // mesuré au montage → sans ça, fitBounds part au zoom max (carte vide).
    const id = requestAnimationFrame(() => {
      map.invalidateSize();
      if (initialBounds) {
        if (done.current) return; // cadrage initial unique → le filtre ne recadre pas
        done.current = true;
        map.fitBounds(initialBounds, { padding: [8, 8] });
        return;
      }
      if (points.length === 0) return;
      if (points.length === 1) {
        map.setView(points[0], 13);
      } else {
        map.fitBounds(points, { padding: [30, 30], maxZoom: 13 });
      }
    });
    return () => cancelAnimationFrame(id);
  }, [map, points, initialBounds]);
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
  heightClass = "h-[320px]",
  renderPopup,
  initialBounds,
  renderTooltip,
}: SubproyectosMapProps) {
  const puntos = useMemo(
    () => subproyectos.filter((s) => s.lat != null && s.lng != null),
    [subproyectos],
  );
  const coords = useMemo<LatLngTuple[]>(
    () => puntos.map((s) => [s.lat as number, s.lng as number]),
    [puntos],
  );

  // Centre/zoom initiaux : province si cadre fixe, sinon 1er point.
  const center: LatLngTuple = initialBounds ? [-31.3, -60.8] : coords[0] ?? [-31.6, -60.7];

  return (
    <MapContainer
      center={center}
      zoom={initialBounds ? 6 : 7}
      scrollWheelZoom={wheelZoom === "always"}
      className={cn(heightClass, "w-full rounded-md")}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds points={coords} initialBounds={initialBounds} />
      {wheelZoom === "ctrl" && <CtrlWheelZoom />}
      {puntos.map((s) => {
        const tp = getTipologia(s.tipologia);
        const sel = s.uid === selected;
        const color = tp?.color ?? UI.textMuted;
        const tip = renderTooltip ? renderTooltip(s) : { text: s.nombre, permanent: false };
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
            eventHandlers={{ click: () => onSelect?.(s.uid) }}
          >
            <Tooltip
              key={tip.permanent ? "perm" : "hover"}
              permanent={tip.permanent}
              direction={tip.permanent ? "right" : "top"}
            >
              {tip.text}
            </Tooltip>
            {renderPopup && <Popup>{renderPopup(s)}</Popup>}
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
