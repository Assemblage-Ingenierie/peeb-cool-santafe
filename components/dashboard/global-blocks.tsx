"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { Snapshot, SnapshotMetrica } from "@/lib/snapshot";
import { COMPONENTES } from "@/lib/constants";
import { useComponentFilters } from "@/components/filter-context";
import { economiaKwh, economiaPct, suma } from "@/lib/calc";
import { fmtNumero } from "@/lib/format";
import { ClipboardIcon, CheckIcon } from "@/components/icons";

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
  const filtros = useComponentFilters();
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
      DOC_SECCIONES.filter((c) => filtros.has(c.code)).flatMap((c) =>
        data.docsProyecto
          .filter((d) => d.componente === c.code)
          .map((d) => ({ ...d, color: c.color })),
      ),
    [data.docsProyecto, filtros],
  );

  const datos: { label: string; value: number | null; unit: string }[] = [
    { label: "Superficie total", value: t.superficie, unit: "m²" },
    { label: "Demanda actual", value: t.demanda, unit: "kWh" },
    { label: "Demanda proyectada", value: t.despues, unit: "kWh" },
    { label: "Ahorro de energía", value: t.ahorro, unit: "kWh" },
    { label: "Ahorro de energía (%)", value: t.ahorroPct, unit: "%" },
    { label: "Emisiones de GEI iniciales", value: t.geiAntes, unit: "tCO₂" },
    { label: "Reducción de GEI", value: t.geiRed, unit: "tCO₂" },
    { label: "Costo de inversión total", value: t.costoTotal, unit: "€" },
    { label: "Beneficiarios — Personal", value: t.personal, unit: "" },
    { label: "Beneficiarios — Usuarios", value: t.usuarios, unit: "" },
    { label: "Beneficiarios — Población cubierta", value: t.indirectos, unit: "" },
  ];
  const dec = (u: string) => (u === "tCO₂" || u === "%" ? 1 : 0);
  const fmtDato = (r: { value: number | null; unit: string }) =>
    r.value == null ? fmtNumero(null) : `${fmtNumero(r.value, dec(r.unit))}${r.unit ? " " + r.unit : ""}`;
  // TSV (Dato / Valor / Unidad) — se pega como tabla en Excel.
  const datosTSV =
    "Dato\tValor\tUnidad\n" +
    datos
      .map((r) => `${r.label}\t${r.value == null ? "" : fmtNumero(r.value, dec(r.unit))}\t${r.unit}`)
      .join("\n");

  return (
    <section className="grid gap-4 lg:grid-cols-3">
      {/* Datos técnicos — totaux du projet */}
      <BlockCard title="Datos técnicos" action={<CopyButton text={datosTSV} />}>
        <dl className="divide-y divide-[var(--border)]">
          {datos.map((r) => (
            <div key={r.label} className="flex items-baseline justify-between gap-3 py-1.5">
              <dt className="text-xs text-[var(--text-muted)]">{r.label}</dt>
              <dd className="whitespace-nowrap text-sm font-semibold text-[var(--text)]">{fmtDato(r)}</dd>
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

function BlockCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-[var(--text)]">{title}</h2>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

/** Bouton « Copiar » : copie un TSV dans le presse-papiers (collage direct en Excel). */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        const cb = navigator.clipboard;
        if (!cb) return;
        cb.writeText(text).then(
          () => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          },
          () => {},
        );
      }}
      title="Copiar como tabla (pegar en Excel)"
      className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-muted)] transition-colors hover:bg-[var(--app-bg)] hover:text-[var(--text)]"
    >
      {copied ? <CheckIcon className="h-3.5 w-3.5" /> : <ClipboardIcon className="h-3.5 w-3.5" />}
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}
