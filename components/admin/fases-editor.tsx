"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { ESTADOS, CARD_TONOS, DURACION_UNIDADES, type ComponenteCode } from "@/lib/constants";
import { construirCartasPorFila, type RoadmapOverride } from "@/lib/roadmap";
import type { AdminRow } from "./editable-table";
import type { RoadmapEstadoRow } from "@/lib/admin/read";

// ============================================================
// Section « Fases » de l'Admin (Gestión de subproyectos).
// Chaque fase : estado + fecha inicio + duración estimada + fecha fin, avec la
// liste REPLIABLE de ses tâches (cartes de Hojas de ruta, synchronisées via le
// modèle partagé lib/roadmap). Chaque tâche a aussi inicio / duración / fin.
// Les trois champs sont indépendants (durée « estimée »).
// ============================================================

// Ordre des composantes dans la liste des tâches d'une fase.
const COMP_ORDER: ComponenteCode[] = ["EE", "G", "AyS", "GP"];

// Gabarit de colonnes commun aux lignes de fase et de tâche (alignement).
const GRID = "minmax(0,1fr) 132px 132px 150px 132px";

export interface TaskPlan {
  fechaInicio: string | null;
  fechaFin: string | null;
  durValor: number | null;
  durUnidad: string | null;
}

export function FasesEditor({
  fases,
  feuille,
  tipologia,
  roadmapEstado,
  onFaseField,
  onFaseDuracion,
  onTaskPlan,
}: {
  fases: AdminRow[];
  feuille: string;
  tipologia: string;
  roadmapEstado: RoadmapEstadoRow[];
  onFaseField: (uid: string, key: string, value: string) => void;
  onFaseDuracion: (uid: string, durValor: number | null, durUnidad: string | null) => void;
  onTaskPlan: (tareaKey: string, patch: Partial<TaskPlan>) => void;
}) {
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());
  const toggle = (code: string) =>
    setAbiertas((prev) => {
      const n = new Set(prev);
      if (n.has(code)) n.delete(code);
      else n.add(code);
      return n;
    });

  // État de la feuille de route pour ce sous-projet → overrides + planes.
  const estado = new Map<string, RoadmapOverride>();
  const planes = new Map<string, TaskPlan>();
  for (const r of roadmapEstado) {
    if (r.feuille !== feuille) continue;
    estado.set(r.tarea_key, {
      oculta: r.oculta,
      creada: r.creada,
      componente: (r.componente as ComponenteCode | null) ?? null,
      fila: r.fila,
      orden: r.orden,
      nombre: r.nombre,
    });
    planes.set(r.tarea_key, {
      fechaInicio: r.fecha_inicio,
      fechaFin: r.fecha_fin,
      durValor: r.dur_valor,
      durUnidad: r.dur_unidad,
    });
  }
  const columnas = construirCartasPorFila({ esGlobal: false, tipologia, uid: feuille, estado });
  const tareasDeFase = (code: string) =>
    COMP_ORDER.flatMap((comp) => columnas.get(`${code}|${comp}`) ?? []).filter((c) => !c.nota);

  if (fases.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-8 text-center text-sm text-[var(--text-muted)]">
        Sin fases.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      {/* En-tête */}
      <div
        className="grid items-center gap-2 border-b border-[var(--border)] bg-[var(--app-bg)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]"
        style={{ gridTemplateColumns: GRID }}
      >
        <span>Fase</span>
        <span>Estado</span>
        <span>Fecha inicio</span>
        <span>Duración estimada</span>
        <span>Fecha fin</span>
      </div>

      {fases.map((fase) => {
        const code = String(fase.fase ?? "");
        const tareas = tareasDeFase(code);
        const open = abiertas.has(code);
        return (
          <div key={fase.uid} className="border-b border-[var(--border)] last:border-b-0">
            {/* Ligne de fase */}
            <div className="grid items-center gap-2 px-3 py-1.5" style={{ gridTemplateColumns: GRID }}>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => toggle(code)}
                  aria-expanded={open}
                  aria-label={open ? "Ocultar tareas" : "Mostrar tareas"}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[var(--text-muted)] transition-colors hover:bg-[var(--app-bg)] hover:text-[var(--text)]"
                >
                  <ChevronIcon open={open} />
                </button>
                <span className="text-sm font-medium text-[var(--text)]">
                  {String(fase.titulo ?? "") || "—"}
                </span>
                {tareas.length > 0 && (
                  <span className="text-[10px] text-[var(--text-muted)]">({tareas.length})</span>
                )}
              </div>
              <EstadoSelect value={String(fase.estado ?? "")} onChange={(v) => onFaseField(fase.uid, "estado", v)} />
              <DateInput value={String(fase.fecha_inicio ?? "")} onChange={(v) => onFaseField(fase.uid, "fecha_inicio", v)} />
              <DuracionInput
                valor={(fase.dur_valor as number | null) ?? null}
                unidad={(fase.dur_unidad as string | null) ?? null}
                onChange={(valor, unidad) => onFaseDuracion(fase.uid, valor, unidad)}
              />
              <DateInput value={String(fase.fecha_fin ?? "")} onChange={(v) => onFaseField(fase.uid, "fecha_fin", v)} />
            </div>

            {/* Sous-lignes de tâches (repliables) */}
            {open && (
              <div className="bg-[var(--app-bg)]">
                {tareas.length === 0 ? (
                  <p className="px-3 py-2 pl-10 text-xs text-[var(--text-muted)]">
                    Sin tareas en esta fase.
                  </p>
                ) : (
                  tareas.map((t) => {
                    const plan = planes.get(t.key);
                    const tono = CARD_TONOS[t.componente];
                    return (
                      <div
                        key={t.key}
                        className="grid items-center gap-2 border-t border-[var(--border)] px-3 py-1 text-sm"
                        style={{ gridTemplateColumns: GRID }}
                      >
                        <div className="flex items-center gap-2 pl-7">
                          <span
                            aria-hidden="true"
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: tono.foot }}
                          />
                          <span className="truncate text-[13px] text-[var(--text)]" title={t.nombre}>
                            {t.nombre || "—"}
                          </span>
                        </div>
                        <span aria-hidden="true" />
                        <DateInput
                          value={plan?.fechaInicio ?? ""}
                          onChange={(v) => onTaskPlan(t.key, { fechaInicio: v || null })}
                        />
                        <DuracionInput
                          valor={plan?.durValor ?? null}
                          unidad={plan?.durUnidad ?? null}
                          onChange={(valor, unidad) => onTaskPlan(t.key, { durValor: valor, durUnidad: unidad })}
                        />
                        <DateInput
                          value={plan?.fechaFin ?? ""}
                          onChange={(v) => onTaskPlan(t.key, { fechaFin: v || null })}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// --- Champs réutilisables --------------------------------------------------

const fieldCls =
  "w-full rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-1 text-[13px] text-[var(--text)] outline-none focus:border-[var(--focus)]";

function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="date"
      value={value ? value.slice(0, 10) : ""}
      onChange={(e) => onChange(e.target.value)}
      className={fieldCls}
    />
  );
}

function EstadoSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={fieldCls}>
      <option value="">—</option>
      {ESTADOS.map((e) => (
        <option key={e.code} value={e.code}>
          {e.nombre}
        </option>
      ))}
    </select>
  );
}

function DuracionInput({
  valor,
  unidad,
  onChange,
}: {
  valor: number | null;
  unidad: string | null;
  onChange: (valor: number | null, unidad: string | null) => void;
}) {
  return (
    <div className="flex gap-1">
      <input
        type="number"
        min={1}
        value={valor ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value), unidad)}
        className="w-12 rounded border border-[var(--border)] bg-[var(--surface)] px-1 py-1 text-[13px] text-[var(--text)] outline-none focus:border-[var(--focus)]"
        aria-label="Cantidad"
      />
      <select
        value={unidad ?? ""}
        onChange={(e) => onChange(valor, e.target.value || null)}
        className={cn(fieldCls, "flex-1")}
        aria-label="Unidad"
      >
        <option value="">—</option>
        {DURACION_UNIDADES.map((u) => (
          <option key={u.code} value={u.code}>
            {u.plural}
          </option>
        ))}
      </select>
    </div>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M6 4 L10 8 L6 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
