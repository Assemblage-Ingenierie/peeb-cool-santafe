"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { Snapshot, SnapshotMetrica } from "@/lib/snapshot";
import { economiaKwh, economiaPct, suma } from "@/lib/calc";
import { fmtNumero } from "@/lib/format";
import { ClipboardIcon, CheckIcon } from "@/components/icons";

// Blocs du bas en mode « Proyecto global » (CDC §4.1) : les données du projet
// (totaux calculés sur les 27 sous-projets, scénario factibilidad) éclatées en
// QUATRE cartes thématiques. Le bloc « Documentos » a été déplacé vers la page
// Biblioteca ; l'ancien 3ᵉ bloc « Por definir » est supprimé.

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

// Désagrégation par genre (bénéficiaires). Moyenne PONDÉRÉE : on ne somme que les
// lignes qui portent À LA FOIS l'effectif et le % de femmes ; `mujeres` = Σ(effectif
// × %/100), `varones` = le complément sur ce même périmètre. Aucune ligne exploitable
// → null (affiché « — », jamais 0). Rien n'est stocké : calculé à l'affichage.
function sexoBy<T>(
  rows: T[],
  getBenef: (x: T) => number | null,
  getPct: (x: T) => number | null,
): { mujeres: number | null; varones: number | null } {
  let muj = 0;
  let tot = 0;
  let any = false;
  for (const r of rows) {
    const b = getBenef(r);
    const p = getPct(r);
    if (b != null && p != null) {
      muj += (b * p) / 100;
      tot += b;
      any = true;
    }
  }
  if (!any) return { mujeres: null, varones: null };
  return { mujeres: Math.round(muj), varones: Math.round(tot - muj) };
}

interface Fila {
  label: string;
  value: number | null;
  unit: string;
  // Sous-ligne « Mujeres / Varones » (bénéficiaires uniquement).
  sexo?: { mujeres: number | null; varones: number | null };
}

interface Seccion {
  titulo: string;
  filas: Fila[];
  nota?: string; // note en pied de carte (ex. réserve sur la couverture du genre)
}

const dec = (u: string) => (u === "tCO₂" || u === "%" ? 1 : 0);
const fmtDato = (r: { value: number | null; unit: string }) =>
  r.value == null
    ? fmtNumero(null)
    : `${fmtNumero(r.value, dec(r.unit))}${r.unit ? " " + r.unit : ""}`;

export function GlobalBlocks({ data }: { data: Snapshot }) {
  const fai = useMemo<SnapshotMetrica[]>(
    () => data.metricas.filter((m) => m.escenario === "faisabilidad"),
    [data.metricas],
  );

  const secciones = useMemo<Seccion[]>(() => {
    const demanda = sumBy(fai, (m) => m.demanda_kwh);
    const despues = sumBy(fai, (m) => m.demanda_despues_kwh);
    const geiAntes = sumBy(fai, (m) => m.gei_antes_tco2);
    const geiDespues = sumBy(fai, (m) => m.gei_despues_tco2);
    const costoEe = sumBy(fai, (m) => m.costo_ee_eur);
    const costoOtras = sumBy(fai, (m) => m.costo_otras_eur);

    return [
      {
        titulo: "Datos de renovación energética",
        filas: [
          { label: "Superficie total", value: sumBy(data.subproyectos, (s) => s.superficie_m2), unit: "m²" },
          { label: "Demanda actual", value: demanda, unit: "kWh" },
          { label: "Demanda proyectada", value: despues, unit: "kWh" },
          { label: "Ahorro de energía", value: economiaKwh(demanda, despues), unit: "kWh" },
          { label: "Ahorro de energía (%)", value: economiaPct(demanda, despues), unit: "%" },
        ],
      },
      {
        titulo: "Impactos climáticos",
        filas: [
          { label: "Emisiones de GEI iniciales", value: geiAntes, unit: "tCO₂" },
          { label: "Emisiones de GEI después de las obras", value: geiDespues, unit: "tCO₂" },
          { label: "Reducción de GEI", value: economiaKwh(geiAntes, geiDespues), unit: "tCO₂" },
          { label: "% de reducción", value: economiaPct(geiAntes, geiDespues), unit: "%" },
        ],
      },
      {
        titulo: "Impactos financieros",
        filas: [
          { label: "Costo de inversión total", value: suma(costoEe, costoOtras), unit: "€" },
          // Placeholders — pas encore de champ en base (affichent « — »).
          { label: "Ahorros anuales estimados", value: null, unit: "€" },
          { label: "TRI", value: null, unit: "" },
        ],
      },
      {
        titulo: "Impactos sobre beneficiarios",
        filas: [
          {
            label: "Personal",
            value: sumBy(fai, (m) => m.benef_personal),
            unit: "",
            sexo: sexoBy(fai, (m) => m.benef_personal, (m) => m.benef_personal_pct_muj),
          },
          {
            label: "Usuarios",
            value: sumBy(fai, (m) => m.benef_usuarios),
            unit: "",
            sexo: sexoBy(fai, (m) => m.benef_usuarios, (m) => m.benef_usuarios_pct_muj),
          },
          {
            label: "Población cubierta",
            value: sumBy(fai, (m) => m.benef_indirectos),
            unit: "",
            sexo: sexoBy(fai, (m) => m.benef_indirectos, (m) => m.benef_indirectos_pct_muj),
          },
        ],
        nota:
          "El total abarca todos los subproyectos; la desagregación por género sólo considera los que declaran una distribución, por lo que Mujeres + Varones puede ser menor que el total.",
      },
    ];
  }, [fai, data.subproyectos]);

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {secciones.map((s) => (
        <BlockCard key={s.titulo} title={s.titulo} action={<CopyButton text={tsvDe(s)} />}>
          <dl className="divide-y divide-[var(--border)]">
            {s.filas.map((r) => (
              <div key={r.label} className="py-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-xs text-[var(--text-muted)]">{r.label}</dt>
                  <dd
                    className={
                      "whitespace-nowrap text-sm font-semibold tabular-nums " +
                      (r.value == null ? "text-[var(--text-muted)]" : "text-[var(--text)]")
                    }
                  >
                    {fmtDato(r)}
                  </dd>
                </div>
                {r.sexo && (r.sexo.mujeres != null || r.sexo.varones != null) && (
                  <div className="mt-0.5 flex justify-between gap-3 pl-3 text-[11px] tabular-nums text-[var(--text-muted)]">
                    <span>
                      <span className="text-[#9aa1ad]">Mujeres</span> {fmtNumero(r.sexo.mujeres)}
                    </span>
                    <span>
                      <span className="text-[#9aa1ad]">Varones</span> {fmtNumero(r.sexo.varones)}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </dl>
          {s.nota && (
            <p className="mt-3 border-t border-[var(--border)] pt-2 text-[11px] leading-snug text-[var(--text-muted)]">
              {s.nota}
            </p>
          )}
        </BlockCard>
      ))}
    </section>
  );
}

/** TSV (Dato / Valor / Unidad) d'une section — se colle comme tableau dans Excel. */
function tsvDe(s: Seccion): string {
  const filas: string[] = [];
  for (const r of s.filas) {
    filas.push(`${r.label}\t${r.value == null ? "" : fmtNumero(r.value, dec(r.unit))}\t${r.unit}`);
    if (r.sexo) {
      if (r.sexo.mujeres != null) filas.push(`  Mujeres\t${fmtNumero(r.sexo.mujeres)}\t`);
      if (r.sexo.varones != null) filas.push(`  Varones\t${fmtNumero(r.sexo.varones)}\t`);
    }
  }
  return "Dato\tValor\tUnidad\n" + filas.join("\n");
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
