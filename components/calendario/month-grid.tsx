import type { SnapshotEvento } from "@/lib/snapshot";
import { getComponente } from "@/lib/constants";
import { cn } from "@/lib/cn";
import {
  DIAS_SEMANA,
  diasDelMes,
  horaEnZona,
  ymd,
  type Zona,
} from "./fechas";

// Nombre d'événements montrés par jour avant le « +N más ».
const MAX_POR_DIA = 3;

interface MonthGridProps {
  year: number;
  month: number; // 0-based
  eventos: SnapshotEvento[];
  hoy: string; // « AAAA-MM-DD » (jour courant, local)
  zona: Zona;
  onSelect: (evento: SnapshotEvento) => void;
}

/**
 * Grille mensuelle type Google Agenda (CDC §4.3). Semaine lundi→dimanche ;
 * jours du mois courant en avant, jours adjacents estompés, jour courant surligné.
 * Événements en pastilles « couleur pleine » de la composante (réutilise
 * getComponente, cf. components/dashboard/agenda.tsx), triées par heure.
 */
export function MonthGrid({ year, month, eventos, hoy, zona, onSelect }: MonthGridProps) {
  const dias = diasDelMes(year, month);

  // Regroupement par jour (clé = `fecha` brute). Événements sans nom ignorés
  // (cohérent avec l'Agenda du dashboard).
  const porDia = new Map<string, SnapshotEvento[]>();
  for (const e of eventos) {
    if (!(e.nombre ?? "").trim()) continue;
    const arr = porDia.get(e.fecha);
    if (arr) arr.push(e);
    else porDia.set(e.fecha, [e]);
  }
  // Tri par heure de début argentine (l'ordre chronologique est préservé quelle
  // que soit la zone d'affichage) ; sans heure → en fin de journée.
  for (const arr of porDia.values()) {
    arr.sort((a, b) => (a.hora_inicio ?? "99:99").localeCompare(b.hora_inicio ?? "99:99"));
  }

  return (
    <div className="overflow-hidden rounded-lg border-l border-t border-[var(--border)] bg-[var(--surface)]">
      {/* En-têtes des jours de la semaine */}
      <div className="grid grid-cols-7">
        {DIAS_SEMANA.map((d) => (
          <div
            key={d}
            className="border-b border-r border-[var(--border)] bg-[var(--app-bg)] py-2 text-center text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Jours */}
      <div className="grid grid-cols-7">
        {dias.map((dia) => {
          const key = ymd(dia);
          const inMonth = dia.getMonth() === month;
          const isHoy = key === hoy;
          const evs = porDia.get(key) ?? [];
          const visibles = evs.slice(0, MAX_POR_DIA);
          const resto = evs.length - visibles.length;

          return (
            <div
              key={key}
              className={cn(
                "min-h-[92px] border-b border-r border-[var(--border)] p-1 sm:min-h-[116px]",
                !inMonth && "bg-[var(--app-bg)]/60",
              )}
            >
              <div className="mb-1">
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                    isHoy
                      ? "bg-[var(--accent)] font-semibold text-white"
                      : inMonth
                        ? "text-[var(--text)]"
                        : "text-[var(--text-muted)]",
                  )}
                >
                  {dia.getDate()}
                </span>
              </div>

              <div className="flex flex-col gap-0.5">
                {visibles.map((e) => (
                  <Pastilla key={e.uid} evento={e} zona={zona} onSelect={onSelect} />
                ))}
                {resto > 0 && (
                  <span className="px-1 text-[11px] text-[var(--text-muted)]">+{resto} más</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Pastille cliquable : fond plein de la couleur de composante + heure + nom. */
function Pastilla({
  evento,
  zona,
  onSelect,
}: {
  evento: SnapshotEvento;
  zona: Zona;
  onSelect: (evento: SnapshotEvento) => void;
}) {
  const comp = evento.componente ? getComponente(evento.componente) : undefined;
  const hora = horaEnZona(evento.fecha, evento.hora_inicio, zona);
  const titulo = `${hora ? hora + " · " : ""}${evento.nombre}`;

  return (
    <button
      type="button"
      onClick={() => onSelect(evento)}
      title={titulo}
      className={cn(
        "block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] leading-tight transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]",
        !comp && "border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]",
      )}
      style={comp ? { backgroundColor: comp.color, color: comp.onColor } : undefined}
    >
      {hora && <span className="font-semibold">{hora}</span>}
      {hora ? " " : ""}
      {evento.nombre}
    </button>
  );
}
