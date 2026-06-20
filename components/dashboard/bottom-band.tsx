"use client";

import { useMemo, type ReactNode } from "react";
import type {
  Snapshot,
  SnapshotDocumento,
  SnapshotFase,
  SnapshotMetrica,
  Escenario,
} from "@/lib/snapshot";
import { COMPONENTES, FASES, ESTADOS, getTipologia, UI } from "@/lib/constants";
import { cn } from "@/lib/cn";
import { DatosCard } from "./datos-card";
import { useEscenarioToggle } from "./use-escenario";

interface BottomBandProps {
  mode: "global" | "subproyectos";
  data: Snapshot | null;
  tipo: string; // todos | A | H | E
  selected: string | null; // uid d'un sous-projet, ou null (= vue groupe)
}

/**
 * Bande du bas (CDC §4.1 / capture V2).
 * - Mode « Proyecto global » : emplacements réservés (à concevoir plus tard).
 * - Mode « Subproyectos » :
 *   - un bâtiment sélectionné → Datos (sa fiche + toggle), Documentos (liens groupés
 *     par composante), Progreso (fases en vertical, colorées par estado) ;
 *   - un groupe (Todos / typologie) → Datos = totaux du groupe ; Documentos et
 *     Progreso désactivés (titre seul).
 */
export function BottomBand({ mode, data, tipo, selected }: BottomBandProps) {
  const subs = useMemo(() => data?.subproyectos ?? [], [data]);

  const metBySub = useMemo(() => {
    const m = new Map<string, Partial<Record<Escenario, SnapshotMetrica>>>();
    for (const x of data?.metricas ?? []) {
      const e = m.get(x.subproyecto_uid) ?? {};
      e[x.escenario] = x;
      m.set(x.subproyecto_uid, e);
    }
    return m;
  }, [data]);

  const fasesBySub = useMemo(() => {
    const m = new Map<string, SnapshotFase[]>();
    for (const f of data?.fases ?? []) {
      const arr = m.get(f.subproyecto_uid) ?? [];
      arr.push(f);
      m.set(f.subproyecto_uid, arr);
    }
    return m;
  }, [data]);

  const docsBySub = useMemo(() => {
    const m = new Map<string, SnapshotDocumento[]>();
    for (const d of data?.documentos ?? []) {
      const arr = m.get(d.subproyecto_uid) ?? [];
      arr.push(d);
      m.set(d.subproyecto_uid, arr);
    }
    return m;
  }, [data]);

  // Périmètre courant : un bâtiment, ou un groupe (selon le filtre typologie).
  const single = selected ? subs.find((s) => s.uid === selected) ?? null : null;
  const groupSubs = tipo === "todos" ? subs : subs.filter((s) => s.tipologia === tipo);
  const scopeSubs = single ? [single] : groupSubs;

  const proyectoIniciado = (uid: string) => {
    const f = (fasesBySub.get(uid) ?? []).find((x) => x.fase === "proyecto_ejecutivo");
    return f?.estado === "en_proceso" || f?.estado === "terminado";
  };
  const canToggle = scopeSubs.length > 0 && scopeSubs.every((s) => proyectoIniciado(s.uid));
  const proyectoHasData = scopeSubs.some(
    (s) => metBySub.get(s.uid)?.proyecto?.demanda_kwh != null,
  );
  const resetKey = selected ?? `grupo:${tipo}`;
  const { escenario, select } = useEscenarioToggle(canToggle, proyectoHasData, resetKey);

  // Somme (ou valeur unique) du scénario actif sur le périmètre.
  const totales = useMemo(() => {
    let antes = 0,
      despues = 0,
      m2 = 0;
    let hayAntes = false,
      hayDespues = false,
      hayM2 = false;
    for (const s of scopeSubs) {
      const m = metBySub.get(s.uid)?.[escenario];
      if (m?.demanda_kwh != null) {
        antes += m.demanda_kwh;
        hayAntes = true;
      }
      if (m?.demanda_despues_kwh != null) {
        despues += m.demanda_despues_kwh;
        hayDespues = true;
      }
      if (s.superficie_m2 != null) {
        m2 += s.superficie_m2;
        hayM2 = true;
      }
    }
    return {
      antes: hayAntes ? antes : null,
      despues: hayDespues ? despues : null,
      m2: hayM2 ? m2 : null,
    };
  }, [scopeSubs, escenario, metBySub]);

  // --- Mode « Proyecto global » : placeholders (à concevoir plus tard) ---------
  if (mode === "global") {
    return (
      <section className="grid gap-4 lg:grid-cols-3">
        {["Datos", "Documentos", "Progreso"].map((t) => (
          <BlockCard key={t} title={t}>
            <Hint>Por definir</Hint>
          </BlockCard>
        ))}
      </section>
    );
  }

  // --- Mode « Subproyectos » --------------------------------------------------
  if (!data) {
    return (
      <section className="grid gap-4 lg:grid-cols-3">
        {["Datos", "Documentos", "Progreso"].map((t) => (
          <BlockCard key={t} title={t}>
            <Hint>Cargando…</Hint>
          </BlockCard>
        ))}
      </section>
    );
  }

  const scopeLabel = single
    ? single.nombre
    : tipo === "todos"
      ? "Todos los subproyectos"
      : getTipologia(tipo)?.nombre ?? "Grupo";

  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <BlockCard title="Datos">
        {scopeSubs.length === 0 ? (
          <Hint>Sin datos.</Hint>
        ) : (
          <>
            <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">{scopeLabel}</p>
            <DatosCard
              antes={totales.antes}
              despues={totales.despues}
              superficie={totales.m2}
              escenario={escenario}
              canToggle={canToggle}
              onSelectEscenario={select}
            />
          </>
        )}
      </BlockCard>

      <BlockCard title="Documentos">
        {single ? (
          <DocumentosBlock docs={docsBySub.get(single.uid) ?? []} />
        ) : (
          <Hint>Seleccioná un subproyecto.</Hint>
        )}
      </BlockCard>

      <BlockCard title="Progreso">
        {single ? (
          <ProgresoBlock fases={fasesBySub.get(single.uid) ?? []} />
        ) : (
          <Hint>Seleccioná un subproyecto.</Hint>
        )}
      </BlockCard>
    </section>
  );
}

// --- Sous-composants --------------------------------------------------------

function BlockCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <h2 className="text-sm font-semibold text-[var(--text)]">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return (
    <p className="flex h-20 items-center justify-center text-center text-xs text-[var(--text-muted)]">
      {children}
    </p>
  );
}

/** Documents groupés par composante ; cliquables si un lien existe. */
function DocumentosBlock({ docs }: { docs: SnapshotDocumento[] }) {
  if (docs.length === 0) return <Hint>Sin documentos.</Hint>;

  const grupos: { label: string; color: string; items: SnapshotDocumento[] }[] = [];
  for (const c of COMPONENTES) {
    const items = docs.filter((d) => d.componente === c.code);
    if (items.length) grupos.push({ label: c.nombre, color: c.color, items });
  }
  const sinComp = docs.filter(
    (d) => !d.componente || !COMPONENTES.some((c) => c.code === d.componente),
  );
  if (sinComp.length) grupos.push({ label: "Sin componente", color: UI.border, items: sinComp });

  return (
    <div className="flex flex-col gap-3">
      {grupos.map((g) => (
        <div key={g.label}>
          <h3 className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: g.color }}
              aria-hidden="true"
            />
            {g.label}
          </h3>
          <ul className="flex flex-col gap-0.5">
            {g.items.map((d) =>
              d.url ? (
                <li key={d.uid}>
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[var(--focus)] underline-offset-2 hover:underline"
                  >
                    {d.titulo}
                  </a>
                </li>
              ) : (
                <li key={d.uid} className="text-sm text-[var(--text-muted)]" title="Sin enlace">
                  {d.titulo}
                </li>
              ),
            )}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** Couleur d'une fase selon l'estado (terminado / en_proceso / pas démarrée = foncé). */
function colorFase(estado: string | null): { bg: string; fg: string } {
  const e = ESTADOS.find((x) => x.code === estado);
  if (e?.color) return { bg: e.color, fg: e.onColor ?? UI.text };
  return { bg: UI.sidebarBg, fg: UI.sidebarText };
}

/** Fases dans l'ordre chronologique (FASES), empilées verticalement. */
function ProgresoBlock({ fases }: { fases: SnapshotFase[] }) {
  const ordered = FASES.map((f) => ({
    code: f.code,
    nombre: f.nombre,
    estado: fases.find((x) => x.fase === f.code)?.estado ?? null,
  }));

  return (
    <ol className="flex flex-col gap-1.5">
      {ordered.map((f) => {
        const c = colorFase(f.estado);
        return (
          <li
            key={f.code}
            className="rounded px-3 py-1.5 text-xs font-medium"
            style={{ backgroundColor: c.bg, color: c.fg }}
          >
            {f.nombre}
          </li>
        );
      })}
    </ol>
  );
}
