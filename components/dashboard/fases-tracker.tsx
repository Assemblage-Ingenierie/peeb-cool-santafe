"use client";

import { useEffect, useMemo, useState } from "react";
import type { Snapshot } from "@/lib/snapshot";
import { CARD_TONOS, GESTION_FASES, getTipologia } from "@/lib/constants";
import { FASE_SIGLA, LEYENDA_FASES, colorDeFase, textoSobre } from "@/lib/fases-cronograma";
import { fasesEnCurso, pagEjesEnCurso } from "@/lib/fases-actuales";
import { useComponentFilters } from "@/components/filter-context";
import { useRoadmap } from "./use-roadmap";

// ============================================================
// Tracker « Fases en curso » (Inicio) — pour chaque sous-projet dont une fase est
// en cours aujourd'hui, la fase que la barre rouge « hoy » du cronograma traverse
// et son avancement. Puis « Estado de implementación del PAG » : les ejes dont une
// acción court aujourd'hui. Tout est CALCULÉ (lib/fases-actuales) : rien en base.
// Le PAG suit le filtre Vista/Rol (composante Género) → visible en « Todo » et « G ».
// ============================================================

const G_HEAD = CARD_TONOS.G.head; // violeta claro de la charte (Género)
const G_HEAD_TXT = CARD_TONOS.G.headText;
const G_FILL = CARD_TONOS.G.head;

// Barre d'avancement d'une fase/acción : teinte de fond + remplissage jusqu'à
// « hoy » + marqueur rouge. Sans pourcentage (choix validé en maquette).
function Barra({ color, progreso }: { color: string; progreso: number }) {
  const pc = Math.round(progreso * 100);
  return (
    <div className="relative h-2.5 flex-1 overflow-visible rounded-[3px] border border-[var(--border)] bg-[var(--surface)]">
      <span className="absolute inset-0 rounded-[2px]" style={{ backgroundColor: color, opacity: 0.32 }} />
      <span
        className="absolute bottom-0 left-0 top-0 rounded-l-[2px]"
        style={{ width: `${pc}%`, backgroundColor: color }}
      />
      <span
        className="absolute -bottom-[3px] -top-[3px] z-[2] w-0.5 bg-[var(--accent)]"
        style={{ left: `calc(${pc}% - 1px)` }}
      >
        <span className="absolute -left-[2px] -top-[2px] h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
      </span>
    </div>
  );
}

interface FasesTrackerProps {
  snapshot: Snapshot;
}

export function FasesTracker({ snapshot }: FasesTrackerProps) {
  const rm = useRoadmap();
  const filtros = useComponentFilters();

  // « hoy » posé côté client uniquement (anti-décalage d'hydratation), comme le Cronograma.
  const [hoyMs, setHoyMs] = useState<number | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- init client-only (1×)
  useEffect(() => setHoyMs(Date.now()), []);

  const { subs, pag } = useMemo(() => {
    if (rm.status !== "ready" || hoyMs == null) return { subs: [], pag: [] };
    const datos = { ...snapshot, ...rm.data };
    return { subs: fasesEnCurso(datos, hoyMs), pag: pagEjesEnCurso(datos, hoyMs) };
  }, [snapshot, rm, hoyMs]);

  const cargando = rm.status === "loading" || hoyMs == null;
  const error = rm.status === "error";
  const showPag = filtros.has("G");

  return (
    <div className="flex flex-col gap-4">
      {/* Fases en curso · subproyectos */}
      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
          <h2 className="text-[15px] font-bold text-[var(--text)]">Fases en curso · subproyectos</h2>
          <span className="inline-flex items-center gap-1.5 text-[11.5px] text-[var(--text-muted)] tabular-nums">
            <span className="h-3 w-0.5 rounded-sm bg-[var(--accent)]" />
            hoy
          </span>
        </div>

        {/* Leyenda de fases (colores del cronograma) */}
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 border-b border-[var(--border)] px-4 py-2.5 text-[11px] text-[var(--text-muted)]">
          {LEYENDA_FASES.map((code) => {
            const color = colorDeFase(code);
            const nombre = GESTION_FASES.find((f) => f.code === code)?.nombre ?? code;
            return (
              <span key={code} className="inline-flex items-center gap-1.5">
                <span
                  className="inline-flex h-3.5 min-w-[20px] items-center justify-center rounded-[3px] px-1 text-[8.5px] font-extrabold"
                  style={{ backgroundColor: color, color: textoSobre(color) }}
                >
                  {FASE_SIGLA[code] ?? ""}
                </span>
                {nombre}
              </span>
            );
          })}
        </div>

        <div className="p-4">
          {error ? (
            <p className="py-2 text-center text-sm text-[var(--text-muted)]">No se pudieron cargar las fases.</p>
          ) : cargando ? (
            <p className="py-2 text-center text-sm text-[var(--text-muted)]">Cargando…</p>
          ) : subs.length === 0 ? (
            <p className="py-2 text-center text-sm text-[var(--text-muted)]">
              Ningún subproyecto con una fase en curso hoy.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {subs.map((s) => {
                const tp = getTipologia(s.tipologia);
                const color = colorDeFase(s.faseCode);
                return (
                  <div
                    key={s.uid}
                    className="flex flex-col gap-1.5 rounded-md border border-[var(--border)] p-2"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-[3px] text-[9px] font-extrabold"
                        style={{ backgroundColor: tp?.color, color: tp?.onColor }}
                      >
                        {s.tipologia}
                      </span>
                      <span className="truncate text-xs font-semibold text-[var(--text)]" title={s.nombre}>
                        {s.nombre}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex h-4 shrink-0 items-center rounded-[3px] px-1.5 text-[9px] font-extrabold"
                        style={{ backgroundColor: color, color: textoSobre(color) }}
                        title={s.faseNombre}
                      >
                        {FASE_SIGLA[s.faseCode] ?? s.faseCode}
                      </span>
                      <Barra color={color} progreso={s.progreso} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Estado de implementación del PAG (componente Género → sigue el filtro) */}
      {showPag && (
        <section className="overflow-hidden rounded-lg border-0">
          <div className="px-4 py-3" style={{ backgroundColor: G_HEAD }}>
            <h2 className="text-[15px] font-bold" style={{ color: G_HEAD_TXT }}>
              Estado de implementación del PAG
            </h2>
          </div>
          <div className="bg-[var(--surface)] px-4 py-3">
            {error ? (
              <p className="text-sm text-[var(--text-muted)]">No se pudo cargar el PAG.</p>
            ) : cargando ? (
              <p className="text-sm text-[var(--text-muted)]">Cargando…</p>
            ) : pag.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">Ningún eje del PAG en curso hoy.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {pag.map((e) => (
                  <div
                    key={e.code}
                    className="grid grid-cols-1 items-center gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]"
                    title={`${e.accion.code} · ${e.accion.titulo}`}
                  >
                    <span className="truncate text-xs font-semibold text-[var(--text)]">
                      {e.nombre}
                      <span className="ml-1.5 text-[10.5px] font-bold" style={{ color: CARD_TONOS.G.bodyText }}>
                        imp. {e.impactos}
                      </span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex h-4 shrink-0 items-center rounded-[3px] px-1.5 text-[9px] font-extrabold"
                        style={{ backgroundColor: G_FILL, color: G_HEAD_TXT }}
                      >
                        G
                      </span>
                      <Barra color={G_FILL} progreso={e.progreso} />
                    </div>
                    <span className="text-right text-[11px] leading-tight text-[var(--text-muted)] tabular-nums">
                      <span className="font-semibold text-[var(--text)]">{e.accion.code}</span> · {e.accion.responsable}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
