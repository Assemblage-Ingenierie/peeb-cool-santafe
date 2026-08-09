"use client";

import { useMemo, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { CARD_TONOS, UI } from "@/lib/constants";
import {
  FEUILLE_PAG,
  PAG_ACCIONES,
  PAG_EJES,
  PAG_ENLACES,
  PAG_FASE_NOMBRE,
  PAG_RELLENO,
  PAG_RESPONSABLES,
  PAG_RESP_NOMBRE,
  PAG_RESTRICCIONES,
  accionesDeEje,
  hayEnlace,
  previasDe,
  siguientesDe,
  pagTareaKey,
  type PagAccion,
  type PagResponsable,
} from "@/lib/pag";
import { addUnidad } from "@/lib/schedule";
import { VENTANAS, ventanaDe, type Ventana } from "@/lib/agenda";

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

  // Mêmes fenêtres que « Próximas tareas » de la feuille globale — découpage
  // partagé (lib/agenda · ventanaDe), pour que « próximo mes » veuille dire la
  // même chose d'un écran à l'autre.
  const ventanas = useMemo(() => {
    if (hoyMs == null) return null;
    const cubos: Record<Ventana, PagAccion[]> = { en_curso: [], d15: [], m1: [], m2: [] };
    for (const a of PAG_ACCIONES) {
      const v = ventanaDe(hoyMs, msDe(a.inicio), a.fin ? msDe(a.fin) : finSolido(a));
      if (v) cubos[v].push(a);
    }
    for (const k of ["d15", "m1", "m2"] as const)
      cubos[k].sort((x, y) => (x.inicio < y.inicio ? -1 : x.inicio > y.inicio ? 1 : 0));
    return cubos;
  }, [hoyMs]);

  const stat = (code: string) => `${FEUILLE_PAG}::${pagTareaKey(code)}`;
  const hecha = (code: string) => realizadas.has(stat(code));

  const totalHechas = PAG_ACCIONES.filter((a) => hecha(a.code)).length;
  const porResp = (r: PagResponsable) => PAG_ACCIONES.filter((a) => a.responsable === r).length;

  return (
    <div className="flex flex-col">
      {/* En-tête : compteurs + clé des remplissages (la même que le cronograma). */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3">
        <h2 className="text-base font-semibold text-[var(--text)]">Acciones del PAG por eje</h2>
        <p className="text-xs text-[var(--text-muted)]">
          {PAG_ACCIONES.length} acciones · {PAG_ENLACES.length} enlaces indicados en el archivo ·{" "}
          {totalHechas} realizada{totalHechas === 1 ? "" : "s"}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-y border-[var(--border)] bg-[var(--app-bg)] px-4 py-1.5 text-xs text-[var(--text-muted)]">
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
        <div className="grid gap-x-6 gap-y-4 border-b border-[var(--border)] px-4 py-3 sm:grid-cols-2 lg:grid-cols-4">
          {VENTANAS.map((v) => {
            const lista = ventanas[v.key];
            return (
              <div key={v.key}>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {v.titulo}
                </p>
                {lista.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)]">—</p>
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
            );
          })}
        </div>
      )}

      {/* Un groupe par eje. Les « cadenas » n'existaient pas dans le fichier :
          il n'y définit que 13 liaisons éparses, reprises telles quelles. */}
      {PAG_EJES.map((eje) => {
        const acciones = accionesDeEje(eje.code);
        const hechas = acciones.filter((a) => hecha(a.code)).length;
        const enGrupo = new Set(acciones.map((a) => a.code));
        return (
          <section key={eje.code}>
            <div
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-1.5"
              style={{ backgroundColor: UI.sidebarBg }}
            >
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: UI.sidebarText }}>
                {eje.nombre}
              </h3>
              <span className="text-[10px]" style={{ color: UI.sidebarTextMuted }}>
                impactos {eje.impactos}
              </span>
              <span className="ml-auto text-xs tabular-nums" style={{ color: UI.sidebarTextMuted }}>
                {hechas}/{acciones.length} realizadas
              </span>
            </div>

            {/* Une SEULE rangée qui défile : les cartes ne passent jamais à la
                ligne. Une flèche n'apparaît QUE si le fichier PAG relie vraiment
                les deux cartes qu'elle touche ; sinon, simple espace. Les liaisons
                qui ne tombent pas en voisinage sont écrites sur la carte. */}
            <div className="flex items-stretch overflow-x-auto border-b border-[var(--border)] p-3">
              {acciones.map((a, i) => {
                const previa = i > 0 ? acciones[i - 1] : null;
                const ligada = !!previa && hayEnlace(previa.code, a.code);
                // Liaisons du fichier non visibles par simple voisinage.
                const antes = previasDe(a.code).filter((c) => !(ligada && c === previa?.code));
                const despues = siguientesDe(a.code).filter(
                  (c) => !(enGrupo.has(c) && acciones[i + 1]?.code === c),
                );
                const restriccion = PAG_RESTRICCIONES[a.code];
                const done = hecha(a.code);
                const ini = msDe(a.inicio);
                const fin = a.fin ? msDe(a.fin) : finSolido(a);
                return (
                  <div key={a.code} className="flex w-[17rem] shrink-0 items-stretch">
                    {previa &&
                      (ligada ? (
                        // Trait qui TOUCHE les deux cartes : il part du bord de la
                        // précédente et sa pointe arrive sur le bord de celle-ci.
                        // Aucun code écrit dessous — la flèche montre déjà qui elle
                        // relie.
                        <span
                          className="relative flex w-7 shrink-0 items-center"
                          title={`Según el archivo PAG, ${previa.code} condiciona ${a.code}`}
                        >
                          <span
                            aria-hidden="true"
                            className="h-px w-full"
                            style={{ backgroundColor: UI.textMuted }}
                          />
                          <span
                            aria-hidden="true"
                            className="absolute right-0 h-0 w-0 border-y-[4px] border-l-[6px] border-y-transparent"
                            style={{ borderLeftColor: UI.textMuted }}
                          />
                        </span>
                      ) : (
                        <span aria-hidden="true" className="w-7 shrink-0" />
                      ))}
                    {/* Toutes les cartes ont le même cadre : le pointillé qui
                        distinguait les acciones continues n'était expliqué nulle
                        part. Leur caractère continu se lit dans le pied de carte
                        (« 4 sem, luego continuo »). */}
                    <article
                      className={cn(
                        "flex flex-1 flex-col overflow-hidden rounded-md border",
                        done ? "opacity-60" : "",
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

                      {/* Ce que le fichier dit et qu'aucune flèche ne montre. */}
                      {(antes.length > 0 || despues.length > 0 || restriccion) && (
                        <div className="flex flex-col gap-0.5 px-2 pb-1.5 text-[10px] leading-tight">
                          {antes.length > 0 && (
                            <span className="text-[var(--text-muted)]">
                              Después de <span className="font-mono">{antes.join(", ")}</span>
                            </span>
                          )}
                          {despues.length > 0 && (
                            <span className="text-[var(--text-muted)]">
                              Antes de <span className="font-mono">{despues.join(", ")}</span>
                            </span>
                          )}
                          {restriccion && (
                            <span
                              style={{ color: restriccion.alerta ? UI.accent : undefined }}
                              className={restriccion.alerta ? "font-medium" : "text-[var(--text-muted)]"}
                            >
                              {restriccion.alerta ? "⚠ " : ""}
                              {restriccion.texto}
                            </span>
                          )}
                        </div>
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
