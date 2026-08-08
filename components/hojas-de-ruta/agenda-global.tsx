"use client";

import { useMemo, useSyncExternalStore } from "react";
import { CARD_TONOS, getTipologia, UI } from "@/lib/constants";
import { construirAgenda, type TareaAgenda } from "@/lib/agenda";
import type { Roadmap, Snapshot } from "@/lib/snapshot";

// ============================================================
// Hoja de ruta « Proyecto global » — Próximas tareas.
//
// Remplace l'ancienne grille de cartes par semestre. On part de la barre « hoy »
// du cronograma : les tâches qu'elle TRAVERSE sont en cours, celles qui
// DÉMARRENT ensuite sont classées à 15 jours / 1 mois / 2 mois.
//
// Aucune donnée propre : tout est recalculé depuis les cronogramas (lib/agenda).
// ============================================================

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const fmtCorta = (ms: number) => {
  const d = new Date(ms);
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
};
const fmtLarga = (ms: number) => {
  const d = new Date(ms);
  return `${d.getDate()} de ${["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"][d.getMonth()]} de ${d.getFullYear()}`;
};
const dias = (a: number, b: number) => Math.round((b - a) / 86_400_000);

// La date du jour ne change pas pendant la session : rien à quoi s'abonner.
// Le nombre renvoyé est stable d'un appel à l'autre, comme l'exige getSnapshot.
const suscribirNunca = () => () => {};
const hoyLocalMs = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

export function AgendaGlobal({
  datos,
  filtros,
}: {
  datos: Snapshot & Roadmap;
  filtros: Set<string>;
}) {
  // « hoy » = minuit local, côté CLIENT uniquement : le serveur n'a pas le fuseau
  // du lecteur, et une date figée au build ferait dériver la feuille jour après
  // jour. `useSyncExternalStore` fournit la valeur sans setState dans un effet ;
  // le snapshot serveur vaut null, d'où l'état « Calculando… » avant hydratation.
  const hoyMs = useSyncExternalStore(suscribirNunca, hoyLocalMs, () => null);

  const agenda = useMemo(
    () => (hoyMs == null ? null : construirAgenda(datos, hoyMs)),
    [datos, hoyMs],
  );

  if (agenda == null || hoyMs == null) {
    return <p className="px-4 py-8 text-sm text-[var(--text-muted)]">Calculando próximas tareas…</p>;
  }

  // Filtre « Vista / Rol » : s'applique aux cartes, jamais aux phases (un jalon
  // structurant concerne toutes les composantes).
  const visible = (t: TareaAgenda) => t.esFase || filtros.has(t.componente ?? "");
  const total = agenda.reduce((n, v) => n + v.tareas.filter(visible).length, 0);

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3">
        <h2 className="text-base font-semibold text-[var(--text)]">Próximas tareas</h2>
        <p className="text-xs text-[var(--text-muted)]">
          Referencia: {fmtLarga(hoyMs)} · {datos.subproyectos.length} subproyectos + proyecto global ·{" "}
          {total} {total === 1 ? "tarea" : "tareas"}
        </p>
      </div>

      {agenda.map((v) => {
        const tareas = v.tareas.filter(visible);
        const enCurso = v.key === "en_curso";
        return (
          <section key={v.key}>
            {/* Bandeau de fenêtre : texte clair sur gris sombre (celui de la
                sidebar, lib/constants). Les repères colorés en tête de bandeau
                ont été retirés — la fenêtre se lit au libellé, pas à la couleur. */}
            <div
              className="flex items-center gap-2.5 px-4 py-1.5"
              style={{ backgroundColor: UI.sidebarBg }}
            >
              <h3
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: UI.sidebarText }}
              >
                {v.titulo}
              </h3>
              <span
                className="ml-auto text-xs tabular-nums"
                style={{ color: UI.sidebarTextMuted }}
              >
                {tareas.length} {tareas.length === 1 ? "tarea" : "tareas"}
              </span>
            </div>

            {tareas.length === 0 ? (
              <p className="px-4 py-3 text-sm text-[var(--text-muted)]">
                {enCurso ? "Ninguna tarea en curso." : "Nada previsto en esta ventana."}
              </p>
            ) : (
              <ul>
                {tareas.map((t) => {
                  const tono = t.componente ? CARD_TONOS[t.componente] : null;
                  const tip = t.tipologia ? getTipologia(t.tipologia) : null;
                  // En cours : c'est la FIN qui informe ; à venir : le démarrage.
                  const ref = enCurso ? t.finMs : t.inicioMs;
                  const n = dias(hoyMs, ref);
                  return (
                    <li
                      key={t.id}
                      className="grid grid-cols-[96px_1fr] items-stretch gap-x-3 gap-y-1 border-b border-[var(--border)] px-4 py-2 last:border-b-0 sm:grid-cols-[96px_48px_1fr_104px]"
                    >
                      {/* Bâtiment : texte courant, encadré d'un liseré à la couleur
                          de sa typologie à gauche et d'un filet léger à droite qui
                          le sépare du reste du tableau. La pastille pleine était
                          jugée trop appuyée. La feuille globale n'a pas de
                          typologie : liseré gris neutre. */}
                      <span
                        className="flex items-center border-l-[3px] border-r pl-2 pr-2 text-xs leading-snug text-[var(--text)]"
                        style={{
                          borderLeftColor: tip?.color ?? UI.textMuted,
                          borderRightColor: UI.border,
                        }}
                        title={t.subproyecto}
                      >
                        {t.sigla}
                      </span>

                      {t.esFase ? (
                        <span className="justify-self-start self-center rounded border border-[var(--border)] px-1.5 py-0.5 text-xs font-semibold text-[var(--text-muted)]">
                          Fase
                        </span>
                      ) : (
                        <span
                          className="justify-self-start self-center rounded px-2 py-0.5 text-xs font-bold"
                          style={{ backgroundColor: tono?.head, color: tono?.headText }}
                        >
                          {t.componente}
                        </span>
                      )}

                      <span className="col-start-2 self-center text-sm leading-snug text-[var(--text)] sm:col-start-3">
                        {t.nombre}
                      </span>

                      <span className="col-start-2 self-center text-xs tabular-nums text-[var(--text-muted)] sm:col-start-4 sm:text-right">
                        <b className="block font-semibold text-[var(--text)]">
                          {enCurso ? `hasta ${fmtCorta(ref)}` : fmtCorta(ref)}
                        </b>
                        {enCurso
                          ? `quedan ${n} ${n === 1 ? "día" : "días"}`
                          : `en ${n} ${n === 1 ? "día" : "días"}`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
