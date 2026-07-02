"use client";

import { MEDIDAS, getComponente, type Medida, type ComponenteCode } from "@/lib/constants";
import { MedidaIcon } from "@/components/medida-icons";
import { fmtNumero, GUION } from "@/lib/format";
import { useComponentFilters, pasaFiltro } from "@/components/filter-context";
import type { SnapshotMedida } from "@/lib/snapshot";

// ============================================================
// Mode Subproyectos (CDC §4.1) — pour un bâtiment sélectionné.
//  • MedidaLogos  : bande de logos des mesures cochées (coin haut-droit du bloc Datos).
//  • MedidasBlocks: blocs « Medidas EE / Medidas género / Otras medidas /
//    Especificidades AyS » sous les 3 blocs. N'affiche QUE les mesures cochées
//    (activa) ; AyS = texto seul (sans kWh). Ordre = MEDIDAS (lib/constants).
// ============================================================

const GRUPOS: { titulo: string; comp: ComponenteCode | null; match: (m: Medida) => boolean }[] = [
  { titulo: "Medidas EE", comp: "EE", match: (m) => m.componente === "EE" },
  { titulo: "Medidas género", comp: "G", match: (m) => m.componente === "G" },
  { titulo: "Otras medidas", comp: null, match: (m) => m.componente === null },
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
  const filtros = useComponentFilters();
  const grupos = GRUPOS.filter((g) => pasaFiltro(filtros, g.comp))
    .map((g) => ({
      titulo: g.titulo,
      comp: g.comp,
      items: MEDIDAS.filter((m) => g.match(m) && active.has(m.code)).map((meta) => ({
        meta,
        row: active.get(meta.code)!,
      })),
    }))
    .filter((g) => g.items.length > 0);

  if (grupos.length === 0) return null;

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      {grupos.map((g) => {
        const c = g.comp ? getComponente(g.comp) : undefined;
        return (
        <div key={g.titulo} className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <h2
            className="px-4 py-2 text-sm font-semibold text-[var(--text)]"
            style={c ? { backgroundColor: c.color, color: c.onColor } : { backgroundColor: "var(--app-bg)" }}
          >
            {g.titulo}
          </h2>
          <ul className="divide-y divide-[var(--border)] px-4 pb-3 pt-1">
            {g.items.map(({ meta, row }) => (
              <li key={meta.code} className="flex items-start gap-2.5 py-2.5 first:pt-1">
                <MedidaIcon code={meta.code} size={22} className="mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium text-[var(--text)]">{meta.nombre}</span>
                    {meta.tieneKwh ? (
                      <span className="shrink-0 whitespace-nowrap text-xs text-[var(--text-muted)]">
                        {row.kwh_anual == null ? GUION : `${fmtNumero(row.kwh_anual)} kWh/año`}
                      </span>
                    ) : null}
                  </div>
                  {row.texto ? (
                    <div className="mt-0.5 space-y-0.5 text-sm text-[var(--text-muted)]">
                      {row.texto
                        .split(/\s*[;\n]+\s*/)
                        .map((s) => s.trim())
                        .filter(Boolean)
                        .map((linea, idx) => (
                          <span key={idx} className="block">
                            {linea}
                          </span>
                        ))}
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
        );
      })}
    </section>
  );
}
