"use client";

import { MEDIDAS, type Medida } from "@/lib/constants";
import { MedidaIcon } from "@/components/medida-icons";
import { fmtNumero } from "@/lib/format";
import type { SnapshotMedida } from "@/lib/snapshot";

// ============================================================
// Mode Subproyectos (CDC §4.1) — pour un bâtiment sélectionné.
//  • MedidaLogos  : bande de logos des mesures cochées (coin haut-droit du bloc Datos).
//  • MedidasBlocks: blocs « Medidas EE / Medidas género / Otras medidas /
//    Especificidades AyS » sous les 3 blocs. N'affiche QUE les mesures cochées
//    (activa) ; AyS = texto seul (sans kWh). Ordre = MEDIDAS (lib/constants).
// ============================================================

const GRUPOS: { titulo: string; match: (m: Medida) => boolean }[] = [
  { titulo: "Medidas EE", match: (m) => m.componente === "EE" },
  { titulo: "Medidas género", match: (m) => m.componente === "G" },
  { titulo: "Otras medidas", match: (m) => m.componente === null },
  { titulo: "Especificidades AyS", match: (m) => m.componente === "AyS" },
];

/** Map code → ligne, restreinte aux mesures cochées. */
function activeByCode(medidas: SnapshotMedida[]): Map<string, SnapshotMedida> {
  return new Map(medidas.filter((m) => m.activa).map((m) => [m.medida, m]));
}

/** Logos (ordre MEDIDAS) des mesures cochées — coin haut-droit du bloc Datos. */
export function MedidaLogos({ medidas }: { medidas: SnapshotMedida[] }) {
  const active = activeByCode(medidas);
  const items = MEDIDAS.filter((m) => active.has(m.code));
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {items.map((m) => (
        <span key={m.code} title={m.nombre}>
          <MedidaIcon code={m.code} size={18} />
        </span>
      ))}
    </div>
  );
}

/** Blocs détaillés des mesures cochées (logo + nom + texto + kWh/año ; AyS sans kWh). */
export function MedidasBlocks({ medidas }: { medidas: SnapshotMedida[] }) {
  const active = activeByCode(medidas);
  const grupos = GRUPOS.map((g) => ({
    titulo: g.titulo,
    items: MEDIDAS.filter((m) => g.match(m) && active.has(m.code)).map((meta) => ({
      meta,
      row: active.get(meta.code)!,
    })),
  })).filter((g) => g.items.length > 0);

  if (grupos.length === 0) return null;

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      {grupos.map((g) => (
        <div key={g.titulo} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="text-sm font-semibold text-[var(--text)]">{g.titulo}</h2>
          <ul className="mt-3 flex flex-col gap-3">
            {g.items.map(({ meta, row }) => (
              <li key={meta.code} className="flex items-start gap-2.5">
                <MedidaIcon code={meta.code} size={22} className="mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium text-[var(--text)]">{meta.nombre}</span>
                    {meta.tieneKwh ? (
                      <span className="shrink-0 whitespace-nowrap text-xs text-[var(--text-muted)]">
                        {fmtNumero(row.kwh_anual)} kWh/año
                      </span>
                    ) : null}
                  </div>
                  {row.texto ? <p className="mt-0.5 text-sm text-[var(--text-muted)]">{row.texto}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
