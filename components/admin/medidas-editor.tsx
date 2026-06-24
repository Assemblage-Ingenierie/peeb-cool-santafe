"use client";

import { MEDIDAS } from "@/lib/constants";
import { MedidaIcon } from "@/components/medida-icons";
import type { MedidaRow } from "@/lib/admin/read";

// ============================================================
// Éditeur des mesures du projet (CDC §4.5), sous « Datos de proyecto ».
// 1 ligne par mesure (ordre MEDIDAS) : picto + nom + case « Activa » +
// texte libre + kWh/an (masqué pour AyS). Vide = NULL → « — », jamais 0.
// État optimiste géré par le parent (SubproyectosPanel) ; ici, rendu + commits.
// ============================================================

interface MedidasEditorProps {
  subUid: string; // sert de clé de remontage des inputs quand on change de sous-projet
  rows: MedidaRow[]; // mesures du sous-projet courant (déjà ordonnées par `orden`)
  onToggle: (medida: string, activa: boolean) => void;
  onText: (medida: string, texto: string) => void;
  onKwh: (medida: string, value: string) => void;
}

export function MedidasEditor({ subUid, rows, onToggle, onText, onKwh }: MedidasEditorProps) {
  const byCode = new Map(rows.map((r) => [r.medida, r]));

  return (
    <dl className="divide-y divide-[var(--border)] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      {MEDIDAS.map((m) => {
        const r = byCode.get(m.code);
        const activa = Boolean(r?.activa);
        const texto = r?.texto ?? "";
        const kwh = r?.kwh_anual ?? null;
        const kwhRaw = kwh === null ? "" : String(kwh);
        return (
          <div
            key={`${subUid}-${m.code}`}
            className="grid grid-cols-1 gap-2 px-4 py-2.5 sm:grid-cols-[13rem_auto_1fr_9rem] sm:items-center sm:gap-3"
          >
            <dt className="flex items-center gap-2.5">
              <MedidaIcon code={m.code} size={22} />
              <span className="text-sm text-[var(--text)]">{m.nombre}</span>
            </dt>

            <label className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <input
                type="checkbox"
                checked={activa}
                onChange={(e) => onToggle(m.code, e.target.checked)}
                aria-label={`Activa — ${m.nombre}`}
                className="h-4 w-4 cursor-pointer"
                style={{ accentColor: m.color }}
              />
              Activa
            </label>

            <input
              type="text"
              defaultValue={texto}
              placeholder="Detalle de la medida…"
              aria-label={`Detalle — ${m.nombre}`}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              onBlur={(e) => {
                if (e.target.value !== texto) onText(m.code, e.target.value);
              }}
              className="block w-full rounded-sm border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm text-[var(--text)] outline-none focus:border-[var(--focus)]"
            />

            {m.tieneKwh ? (
              <input
                type="number"
                step="any"
                defaultValue={kwhRaw}
                placeholder="kWh/año"
                aria-label={`kWh/año — ${m.nombre}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                onBlur={(e) => {
                  if (e.target.value !== kwhRaw) onKwh(m.code, e.target.value);
                }}
                className="block w-full rounded-sm border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm text-[var(--text)] outline-none focus:border-[var(--focus)]"
              />
            ) : (
              <span className="text-xs text-[var(--text-muted)] sm:text-center">sin kWh</span>
            )}
          </div>
        );
      })}
    </dl>
  );
}
