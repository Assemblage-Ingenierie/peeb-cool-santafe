"use client";

import { useMemo, type ReactNode } from "react";
import type { Snapshot, SnapshotMetrica, SnapshotDocProyecto } from "@/lib/snapshot";
import { COMPONENTES } from "@/lib/constants";
import { economiaKwh, economiaPct, suma } from "@/lib/calc";
import { fmtNumero, fmtPct } from "@/lib/format";

// Blocs du bas en mode « Proyecto global » (CDC §4.1 / capture V2) :
// Datos técnicos (totaux calculés sur les 9 sous-projets) · Documentos
// (sections EE/AyS/G depuis « Documentación de proyecto ») · 3ᵉ bloc sans titre.

// Sections de documents : EE / AyS / G (la composante GP est exclue de ce bloc).
const DOC_SECCIONES = COMPONENTES.filter((c) => c.code !== "GP");

function sumBy<T>(rows: T[], get: (x: T) => number | null): number | null {
  let s = 0;
  let any = false;
  for (const r of rows) {
    const v = get(r);
    if (v != null) {
      s += v;
      any = true;
    }
  }
  return any ? s : null;
}

export function GlobalBlocks({ data }: { data: Snapshot }) {
  const fai = useMemo<SnapshotMetrica[]>(
    () => data.metricas.filter((m) => m.escenario === "faisabilidad"),
    [data.metricas],
  );

  const t = useMemo(() => {
    const demanda = sumBy(fai, (m) => m.demanda_kwh);
    const despues = sumBy(fai, (m) => m.demanda_despues_kwh);
    const geiAntes = sumBy(fai, (m) => m.gei_antes_tco2);
    const geiDespues = sumBy(fai, (m) => m.gei_despues_tco2);
    const costoEe = sumBy(fai, (m) => m.costo_ee_eur);
    const costoOtras = sumBy(fai, (m) => m.costo_otras_eur);
    return {
      superficie: sumBy(data.subproyectos, (s) => s.superficie_m2),
      demanda,
      despues,
      ahorro: economiaKwh(demanda, despues),
      ahorroPct: economiaPct(demanda, despues),
      geiAntes,
      geiRed: economiaKwh(geiAntes, geiDespues),
      costoTotal: suma(costoEe, costoOtras),
      personal: sumBy(fai, (m) => m.benef_personal),
      usuarios: sumBy(fai, (m) => m.benef_usuarios),
      indirectos: sumBy(fai, (m) => m.benef_indirectos),
    };
  }, [fai, data.subproyectos]);

  // Documents en lignes (ordre composante EE/AyS/G), avec couleur de liseré.
  const docRows = useMemo(
    () =>
      DOC_SECCIONES.flatMap((c) =>
        data.docsProyecto
          .filter((d) => d.componente === c.code)
          .map((d) => ({ ...d, color: c.color })),
      ),
    [data.docsProyecto],
  );

  const kpis: { label: string; value: string }[] = [
    { label: "Superficie total", value: `${fmtNumero(t.superficie)} m²` },
    { label: "Demanda actual", value: `${fmtNumero(t.demanda)} kWh` },
    { label: "Demanda proyectada", value: `${fmtNumero(t.despues)} kWh` },
    { label: "Ahorro de energía", value: `${fmtNumero(t.ahorro)} kWh` },
    { label: "Ahorro de energía (%)", value: fmtPct(t.ahorroPct) },
    { label: "Emisiones de GEI iniciales", value: `${fmtNumero(t.geiAntes, 1)} tCO₂` },
    { label: "Reducción de GEI", value: `${fmtNumero(t.geiRed, 1)} tCO₂` },
    { label: "Costo de inversión total", value: `${fmtNumero(t.costoTotal)} €` },
    { label: "Beneficiarios — Personal", value: fmtNumero(t.personal) },
    { label: "Beneficiarios — Usuarios", value: fmtNumero(t.usuarios) },
    { label: "Beneficiarios — Población cubierta", value: fmtNumero(t.indirectos) },
  ];

  return (
    <section className="grid gap-4 lg:grid-cols-3">
      {/* Datos técnicos — totaux du projet */}
      <BlockCard title="Datos técnicos">
        <dl className="flex flex-col gap-1.5">
          {kpis.map((k) => (
            <div key={k.label} className="flex items-baseline justify-between gap-3">
              <dt className="text-xs text-[var(--text-muted)]">{k.label}</dt>
              <dd className="whitespace-nowrap text-sm font-semibold text-[var(--text)]">{k.value}</dd>
            </div>
          ))}
        </dl>
      </BlockCard>

      {/* Documentos — sections EE / AyS / G */}
      <BlockCard title="Documentos">
        {docRows.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">Sin documentos.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {docRows.map((d) => (
              <li key={d.uid} style={{ borderLeft: `4px solid ${d.color}` }}>
                {d.url ? (
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block py-2 pl-3 pr-2 text-sm text-[var(--focus)] underline-offset-2 transition-colors hover:bg-[var(--app-bg)] hover:underline"
                  >
                    {d.nombre}
                  </a>
                ) : (
                  <span className="block py-2 pl-3 pr-2 text-sm text-[var(--text-muted)]" title="Sin enlace">
                    {d.nombre}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </BlockCard>

      {/* 3ᵉ bloc — sans titre pour le moment */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex h-full min-h-[120px] items-center justify-center rounded-md border border-dashed border-[var(--border)] text-xs text-[var(--text-muted)]">
          Por definir
        </div>
      </div>
    </section>
  );
}

function BlockCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <h2 className="text-sm font-semibold text-[var(--text)]">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}
