"use client";

import { useMemo, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { CARD_TONOS, UI } from "@/lib/constants";
import {
  FEUILLE_PAG,
  PAG_ACCIONES,
  PAG_CADENAS,
  PAG_FASE_NOMBRE,
  PAG_RELLENO,
  PAG_RESPONSABLES,
  PAG_RESP_NOMBRE,
  getPagAccion,
  pagTareaKey,
  type PagAccion,
  type PagResponsable,
} from "@/lib/pag";
import { addUnidad } from "@/lib/schedule";

// ============================================================
// Hoja de ruta « Implementación del PAG » — tablero de cadenas.
//
// Format SUR MESURE, différent des autres feuilles : ici tout est Género et il
// n'y a pas de fases de sous-projet. Ce qui structure le plan, ce sont les
// CHAÎNES de dépendances des colonnes M/N du fichier PAG — sept bandes
// horizontales de cartes reliées par des flèches.
//
// Ne stocke rien : les fenêtres sont recalculées depuis lib/pag (ancre + durée).
// Seul l'état « realizada » est persisté, via la même mécanique que les autres
// feuilles (peebcoolsf_roadmap_estado, clé `pag-<code>`).
// ============================================================

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const msDe = (iso: string): number => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : 0;
};
const fmtMesAnio = (ms: number): string => {
  const d = new Date(ms);
  return `${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};
const finSolido = (a: PagAccion): number =>
  addUnidad(msDe(a.inicio), a.durValor, a.durUnidad);

const UNIDAD_CORTA: Record<string, string> = { dia: "d", semana: "sem", mes: "meses" };
const duracion = (a: PagAccion): string =>
  `${a.durValor} ${UNIDAD_CORTA[a.durUnidad] ?? a.durUnidad}${a.continua ? `, luego ${a.continuaTxt}` : ""}`;

/** Pastille de responsable — mêmes remplissages que les barres du cronograma. */
function BadgeResponsable({ resp }: { resp: PagResponsable }) {
  const r = PAG_RELLENO[resp];
  return (
    <span
      className="rounded px-1.5 py-0.5 text-[10px] font-bold leading-none"
      style={{
        backgroundColor: r.color,
        backgroundImage: r.patron,
        color: r.texto,
        boxShadow: r.borde ? `inset 0 0 0 1px ${r.borde}` : undefined,
      }}
      title={PAG_RESP_NOMBRE[resp]}
    >
      {resp}
    </span>
  );
}

export function PagBoard({
  realizadas,
  esAdmin,
  onToggle,
}: {
  realizadas: Set<string>;
  esAdmin: boolean;
  onToggle: (statKey: string) => void;
}) {
  // « hoy » côté client uniquement (le serveur n'a pas le fuseau du lecteur).
  const hoyMs = useSyncExternalStore(
    () => () => {},
    () => {
      const d = new Date();
      return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    },
    () => null,
  );

  const ventanas = useMemo(() => {
    if (hoyMs == null) return null;
    const enCurso: PagAccion[] = [];
    const d30: PagAccion[] = [];
    const d90: PagAccion[] = [];
    for (const a of PAG_ACCIONES) {
      const ini = msDe(a.inicio);
      const fin = a.fin ? msDe(a.fin) : finSolido(a);
      if (ini <= hoyMs && fin >= hoyMs) enCurso.push(a);
      else if (ini > hoyMs && ini <= hoyMs + 31 * 86_400_000) d30.push(a);
      else if (ini > hoyMs && ini <= hoyMs + 92 * 86_400_000) d90.push(a);
    }
    return { enCurso, d30, d90 };
  }, [hoyMs]);

  const stat = (code: string) => `${FEUILLE_PAG}::${pagTareaKey(code)}`;
  const hecha = (code: string) => realizadas.has(stat(code));

  const totalHechas = PAG_ACCIONES.filter((a) => hecha(a.code)).length;
  const porResp = (r: PagResponsable) => PAG_ACCIONES.filter((a) => a.responsable === r).length;

  return (
    <div className="flex flex-col">
      {/* En-tête : compteurs + clé des remplissages (la même que le cronograma). */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3">
        <h2 className="text-base font-semibold text-[var(--text)]">
          Acciones del PAG por cadena
        </h2>
        <p className="text-xs text-[var(--text-muted)]">
          {PAG_ACCIONES.length} acciones · {PAG_CADENAS.length} cadenas · {totalHechas} realizada
          {totalHechas === 1 ? "" : "s"}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-y border-[var(--border)] bg-[var(--app-bg)] px-4 py-2 text-xs text-[var(--text-muted)]">
        <span className="text-[10px] font-semibold uppercase tracking-wider">Responsable</span>
        {PAG_RESPONSABLES.map((r) => (
          <span key={r} className="inline-flex items-center gap-1.5">
            <BadgeResponsable resp={r} />
            <span>
              {PAG_RESP_NOMBRE[r]} · {porResp(r)}
            </span>
          </span>
        ))}
        <span className="ml-auto">
          {PAG_ACCIONES.filter((a) => a.aplicaFase).length} acciones se aplican después en los
          subproyectos
        </span>
      </div>

      {/* Próximas acciones — même lecture que « Próximas tareas » de la feuille globale. */}
      {ventanas && (
        <div className="grid gap-x-6 gap-y-4 border-b border-[var(--border)] px-4 py-3 sm:grid-cols-3">
          {(
            [
              ["En curso", ventanas.enCurso],
              ["Empiezan en 1 mes", ventanas.d30],
              ["Empiezan en 3 meses", ventanas.d90],
            ] as const
          ).map(([titulo, lista]) => (
            <div key={titulo}>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                {titulo}
              </p>
              {lista.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">—</p>
              ) : (
                <ul className="flex flex-col gap-0.5">
                  {lista.map((a) => (
                    <li key={a.code} className="flex gap-2 text-xs leading-snug">
                      <span className="shrink-0 font-mono text-[10px] text-[var(--text-muted)]">
                        {a.code}
                      </span>
                      <span className="text-[var(--text)]">{a.titulo}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Les sept chaînes */}
      {PAG_CADENAS.map((cad) => {
        const acciones = cad.orden.map(getPagAccion).filter((a): a is PagAccion => !!a);
        const hechas = acciones.filter((a) => hecha(a.code)).length;
        return (
          <section key={cad.code}>
            <div
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-1.5"
              style={{ backgroundColor: UI.sidebarBg }}
            >
              <span className="font-mono text-[10px] tracking-wider" style={{ color: UI.sidebarTextMuted }}>
                {cad.code}
              </span>
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: UI.sidebarText }}>
                {cad.nombre}
              </h3>
              <span className="text-[10px]" style={{ color: UI.sidebarTextMuted }}>
                {cad.impactos}
              </span>
              <span className="text-[10px]" style={{ color: UI.sidebarTextMuted }}>
                → cada acción habilita la siguiente
              </span>
              <span className="ml-auto text-xs tabular-nums" style={{ color: UI.sidebarTextMuted }}>
                {hechas}/{acciones.length} realizadas
              </span>
            </div>

            {/* Une SEULE rangée qui défile : les cartes ne passent jamais à la
                ligne, donc chaque flèche relie bien deux cartes voisines. Le
                code de la carte précédente est en plus rappelé sous la flèche —
                le lien reste explicite même quand on a fait défiler. */}
            <div className="flex items-stretch overflow-x-auto border-b border-[var(--border)] p-3">
              {acciones.map((a, i) => {
                const previa = i > 0 ? acciones[i - 1] : null;
                const suave = cad.flojo?.includes(a.code);
                const done = hecha(a.code);
                const ini = msDe(a.inicio);
                const fin = a.fin ? msDe(a.fin) : finSolido(a);
                return (
                  <div key={a.code} className="flex w-[17rem] shrink-0 items-stretch">
                    {previa && (
                      <span
                        className={cn(
                          "flex shrink-0 flex-col items-center justify-center gap-0.5 px-1.5 leading-none",
                          suave ? "text-[var(--text-muted)] opacity-60" : "text-[var(--text-muted)]",
                        )}
                        title={
                          suave
                            ? `${previa.code} alimenta esta acción`
                            : `${previa.code} debe estar hecha antes`
                        }
                      >
                        <span aria-hidden="true" className="text-base">
                          {suave ? "⇢" : "→"}
                        </span>
                        <span className="font-mono text-[9px]">{previa.code}</span>
                      </span>
                    )}
                    <article
                      className={cn(
                        "flex flex-1 flex-col overflow-hidden rounded-md border",
                        done ? "opacity-60" : "",
                        a.continua ? "border-dashed" : "",
                      )}
                      style={{ borderColor: CARD_TONOS.G.border }}
                    >
                      <header
                        className="flex items-center gap-2 px-2 py-1"
                        style={{ backgroundColor: CARD_TONOS.G.head }}
                      >
                        <span
                          className="font-mono text-[10px] font-bold"
                          style={{ color: CARD_TONOS.G.headText }}
                        >
                          {a.code}
                        </span>
                        <span className="ml-auto flex items-center gap-1">
                          <BadgeResponsable resp={a.responsable} />
                          {a.apoyoAT && a.responsable !== "AT" && (
                            <span
                              className="rounded border px-1 py-0.5 text-[10px] font-medium leading-none text-[var(--text-muted)]"
                              style={{ borderColor: CARD_TONOS.G.border }}
                              title="Necesita apoyo de la Asistencia Técnica"
                            >
                              +AT
                            </span>
                          )}
                        </span>
                      </header>

                      <p className="flex-1 px-2 py-1.5 text-xs leading-snug text-[var(--text)]">
                        {a.titulo}
                      </p>

                      {a.aplicaFase && (
                        <p className="px-2 pb-1 text-[10px] text-[var(--text-muted)]">
                          Se aplica en {PAG_FASE_NOMBRE[a.aplicaFase] ?? a.aplicaFase}
                        </p>
                      )}

                      <footer
                        className="flex items-center gap-2 border-t px-2 py-1 text-[10px] tabular-nums text-[var(--text-muted)]"
                        style={{ borderColor: CARD_TONOS.G.border }}
                      >
                        <span>{duracion(a)}</span>
                        <span>
                          {fmtMesAnio(ini)} → {a.continua ? a.continuaTxt : fmtMesAnio(fin)}
                        </span>
                        <label
                          className={cn(
                            "ml-auto flex items-center gap-1",
                            esAdmin ? "cursor-pointer" : "cursor-default",
                          )}
                          title={done ? "Realizada" : "Pendiente"}
                        >
                          <input
                            type="checkbox"
                            checked={done}
                            disabled={!esAdmin}
                            onChange={() => onToggle(stat(a.code))}
                            className="h-3.5 w-3.5 accent-[var(--ok)]"
                            aria-label={`Marcar ${a.code} como realizada`}
                          />
                        </label>
                      </footer>
                    </article>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
