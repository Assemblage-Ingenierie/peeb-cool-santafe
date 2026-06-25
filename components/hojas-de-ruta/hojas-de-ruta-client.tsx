"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import {
  FASES,
  ROADMAP_AYS,
  CARD_TONOS,
  COLOR_REALIZADA,
  RESPONSABLE_DEFECTO,
  REQUISITOS_AYS,
  REQUISITOS_AYS_CODES,
  refMgas,
  type ComponenteCode,
} from "@/lib/constants";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { CheckIcon } from "@/components/icons";
import { useSnapshot } from "@/components/dashboard/use-snapshot";

// ============================================================
// Hojas de ruta — page.
// Sous-lots : 1) page + nav + structure des phases ; 2) contenu AyS ;
// 3) édition admin des cartes : « realizada » (pilule) + comentario (texte libre).
// ÉTAT LOCAL pour l'instant (non persisté) — stockage DB dans un sous-lot dédié.
// ============================================================

const HITO_AFD = "no_objecion_afd";

interface FilaRuta {
  code: string;
  nombre: string;
  hito: boolean;
  numero: number | null;
}

// « No objeción AFD » = jalon non numéroté entre « Redacción de pliegos » et
// « Licitación ». Les autres fases sont numérotées 01..N.
const FILAS_RUTA: FilaRuta[] = [];
{
  let numero = 0;
  for (const f of FASES.filter((x) => x.code !== "general")) {
    const hito = f.code === HITO_AFD;
    if (!hito) numero += 1;
    FILAS_RUTA.push({ code: f.code, nombre: f.nombre, hito, numero: hito ? null : numero });
  }
}

// Résolution des libellés de Requisitos AyS (code § → label) pour les cartes dinámicas.
const REQ_LABEL = new Map<string, string>(
  REQUISITOS_AYS.flatMap((g) => g.requisitos.map((r) => [r.code, r.label] as const)),
);

// Carte affichée dans une fase : une tâche, ou un plan (pour les tâches dinámicas).
interface CardModel {
  key: string;
  componente: ComponenteCode;
  nombre: string;
  descripcion?: string;
  nota?: boolean; // description = note (italique) plutôt qu'une référence
}

type Seleccion = "global" | string;
type Vista = "user" | "admin";

export function HojasDeRutaClient() {
  const snap = useSnapshot();
  const admin = isAdmin(getCurrentUser());
  const [seleccion, setSeleccion] = useState<Seleccion>("global");
  const [vista, setVista] = useState<Vista>("admin");
  const esAdmin = admin && vista === "admin";

  // États d'édition — LOCAUX (non persistés). Clé = `${seleccion}::${card.key}`.
  const [realizadas, setRealizadas] = useState<Set<string>>(new Set());
  const [comentarios, setComentarios] = useState<Record<string, string>>({});
  const [comentarioAbierto, setComentarioAbierto] = useState<string | null>(null);
  // No objeción AFD (jalon) : case admin « recibida », par feuille de route.
  const [anoAfd, setAnoAfd] = useState<Record<string, boolean>>({});
  const anoChecked = !!anoAfd[seleccion];

  const subproyectos = snap.status === "ready" ? snap.data.subproyectos : [];
  const aysRequisitos = snap.status === "ready" ? snap.data.aysRequisitos : [];

  // Libellé de la feuille de route active (titre de section).
  const activa =
    seleccion === "global"
      ? "Proyecto global"
      : subproyectos.find((s) => s.uid === seleccion)?.nombre ?? seleccion;

  // Plans (Requisitos AyS) cochés du sous-projet, ordre stable — pour les tâches
  // « dinámicas » : une carte par plan coché en Admin.
  function planesDe(uid: string): { code: string; label: string }[] {
    const checked = new Set(
      aysRequisitos.filter((r) => r.subproyectoUid === uid).map((r) => r.requisito),
    );
    return REQUISITOS_AYS_CODES.filter((c) => checked.has(c)).map((c) => ({
      code: c,
      label: REQ_LABEL.get(c) ?? c,
    }));
  }

  // Cartes d'une fase. Une tâche normale = une carte ; une tâche « dinámica » se
  // décline en une carte par plan coché (référence MGAS en sous-titre). Au niveau
  // global, ou si aucun plan n'est coché, une seule carte générique avec une note.
  function cardsDeFase(faseCode: string): CardModel[] {
    const out: CardModel[] = [];
    for (const t of ROADMAP_AYS) {
      if (t.fase !== faseCode) continue;
      if (!t.dinamica) {
        out.push({ key: t.nombre, componente: t.componente, nombre: t.nombre });
        continue;
      }
      if (seleccion === "global") {
        out.push({
          key: `${t.fase}-global`,
          componente: t.componente,
          nombre: t.nombre,
          descripcion: "Según los requisitos AyS de cada subproyecto",
          nota: true,
        });
        continue;
      }
      const planes = planesDe(seleccion);
      if (planes.length === 0) {
        out.push({
          key: `${t.fase}-vacio`,
          componente: t.componente,
          nombre: t.nombre,
          descripcion: "Sin requisitos AyS marcados",
          nota: true,
        });
        continue;
      }
      for (const p of planes) {
        out.push({
          key: `${t.fase}-${p.code}`,
          componente: t.componente,
          nombre: p.label,
          descripcion: refMgas(p.code),
        });
      }
    }
    return out;
  }

  function toggleRealizada(k: string) {
    setRealizadas((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--text)]">Hojas de ruta</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Hoja de ruta del proyecto global y de cada subproyecto.
          </p>
        </div>
        {admin && (
          <div
            className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--app-bg)] p-0.5"
            role="group"
            aria-label="Vista"
          >
            {(["user", "admin"] as Vista[]).map((v) => {
              const on = vista === v;
              return (
                <button
                  key={v}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setVista(v)}
                  className={cn(
                    "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                    on
                      ? "bg-[var(--surface)] text-[var(--text)] shadow-sm"
                      : "text-[var(--text-muted)] hover:text-[var(--text)]",
                  )}
                >
                  {v === "user" ? "Usuario" : "Admin"}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Navegación entre hojas de ruta */}
      <nav aria-label="Hojas de ruta" className="flex flex-wrap items-center gap-2">
        <RutaButton activo={seleccion === "global"} onClick={() => setSeleccion("global")}>
          Proyecto global
        </RutaButton>
        {subproyectos.map((s) => (
          <RutaButton
            key={s.uid}
            activo={seleccion === s.uid}
            onClick={() => setSeleccion(s.uid)}
          >
            {s.nombre}
          </RutaButton>
        ))}
        {snap.status === "loading" && (
          <span className="self-center text-sm text-[var(--text-muted)]">
            Cargando subproyectos…
          </span>
        )}
        {snap.status === "error" && (
          <span className="self-center text-sm text-[var(--text-muted)]">
            No se pudieron cargar los subproyectos.
          </span>
        )}
      </nav>

      {/* Hoja de ruta activa */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-[var(--text)]">{activa}</h2>

        {/* Estructura vertical de las fases del proyecto */}
        <div className="divide-y divide-[var(--border)] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          {FILAS_RUTA.map((fila) =>
            fila.hito ? (
              // Jalon « No objeción AFD » : espace réservé non numéroté. Case admin
              // « recibida » (rouge) à droite ; une fois cochée, le libellé en bleu.
              <div
                key={fila.code}
                className="relative flex items-center justify-center gap-3 bg-[var(--app-bg)] px-12 py-3"
              >
                <span className="h-px w-8 bg-[var(--border)]" aria-hidden="true" />
                <span
                  className={cn(
                    "text-xs font-semibold uppercase tracking-wide transition-colors",
                    anoChecked ? "text-[var(--focus)]" : "text-[var(--text-muted)]",
                  )}
                >
                  {fila.nombre}
                </span>
                <span className="h-px w-8 bg-[var(--border)]" aria-hidden="true" />
                {esAdmin && (
                  <button
                    type="button"
                    onClick={() => setAnoAfd((p) => ({ ...p, [seleccion]: !p[seleccion] }))}
                    aria-pressed={anoChecked}
                    aria-label="No objeción AFD recibida"
                    title="No objeción AFD recibida"
                    className={cn(
                      "absolute right-4 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded border-2 border-[var(--accent)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]",
                      anoChecked
                        ? "bg-[var(--accent)] text-white"
                        : "bg-transparent text-transparent hover:text-[var(--accent)]",
                    )}
                  >
                    <CheckIcon className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <div key={fila.code} className="flex items-center gap-4 p-4">
                {/* Libellé de la fase — à gauche. */}
                <div className="w-28 shrink-0 self-center sm:w-44">
                  <div className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                    Fase {String(fila.numero).padStart(2, "0")}
                  </div>
                  <div className="mt-0.5 text-sm font-semibold leading-snug text-[var(--text)]">
                    {fila.nombre}
                  </div>
                </div>
                {/* Cartes de la fase (partie AyS pour l'instant). */}
                <div className="flex flex-1 flex-wrap content-start gap-2.5">
                  {cardsDeFase(fila.code).map((card) => {
                    const k = `${seleccion}::${card.key}`;
                    return (
                      <TareaCard
                        key={card.key}
                        card={card}
                        realizada={realizadas.has(k)}
                        comentario={comentarios[k] ?? ""}
                        esAdmin={esAdmin}
                        comentarioAbierto={comentarioAbierto === k}
                        onToggleRealizada={() => toggleRealizada(k)}
                        onAbrirComentario={() =>
                          setComentarioAbierto((cur) => (cur === k ? null : k))
                        }
                        onComentario={(v) => setComentarios((prev) => ({ ...prev, [k]: v }))}
                      />
                    );
                  })}
                </div>
              </div>
            ),
          )}
        </div>

        {admin && (
          <p className="text-xs text-[var(--text-muted)]">
            Modo Admin: marcar realizada y agregar comentario. Cambios locales (sin guardar todavía).
          </p>
        )}
      </section>
    </div>
  );
}

function RutaButton({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={cn(
        "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]",
        activo
          ? "bg-[var(--text)] text-white"
          : "border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--text-muted)] hover:text-[var(--text)]",
      )}
    >
      {children}
    </button>
  );
}

// Carte de tâche — format validé : en-tête coloré (nom en gras) + corps optionnel
// + pied foncé « Responsable ». Côté admin : pilule « realizada » (carte atténuée,
// pilule nette) + comentario (texte libre). Tons par composante (CARD_TONOS).
function TareaCard({
  card,
  realizada,
  comentario,
  esAdmin,
  comentarioAbierto,
  onToggleRealizada,
  onAbrirComentario,
  onComentario,
}: {
  card: CardModel;
  realizada: boolean;
  comentario: string;
  esAdmin: boolean;
  comentarioAbierto: boolean;
  onToggleRealizada: () => void;
  onAbrirComentario: () => void;
  onComentario: (v: string) => void;
}) {
  const tono = CARD_TONOS[card.componente];
  const pillVisible = esAdmin || realizada;

  return (
    <div className="relative w-[232px] rounded-md border" style={{ borderColor: tono.border }}>
      {/* Pilule « realizada » — pleine visibilité (hors du calque atténué). */}
      {pillVisible && (
        <button
          type="button"
          onClick={esAdmin ? onToggleRealizada : undefined}
          disabled={!esAdmin}
          aria-pressed={realizada}
          aria-label="Marcar como realizada"
          title="Realizada"
          className={cn(
            "absolute right-2 top-2 z-10 flex h-[18px] w-7 items-center justify-center rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]",
            realizada
              ? "border-transparent text-white"
              : "border-[var(--text-muted)] bg-[var(--surface)] text-transparent",
            esAdmin && "cursor-pointer",
            esAdmin && !realizada && "hover:text-[var(--text-muted)]",
          )}
          style={realizada ? { backgroundColor: COLOR_REALIZADA } : undefined}
        >
          <CheckIcon className="h-3 w-3" />
        </button>
      )}

      {/* Contenu — atténué quand realizada (la pilule reste nette). */}
      <div className={cn("flex flex-col overflow-hidden rounded-md", realizada && "opacity-45")}>
        <div
          className="px-3 py-2 pr-9 text-center text-[12.5px] font-semibold leading-snug"
          style={{ backgroundColor: tono.head, color: tono.headText }}
        >
          {card.nombre}
        </div>

        {card.descripcion && (
          <div
            className={cn(
              "px-3 py-1.5 text-center text-[11px] leading-snug",
              card.nota && "italic",
            )}
            style={{ backgroundColor: tono.body, color: tono.bodyText }}
          >
            {card.descripcion}
          </div>
        )}

        {comentario && (
          <div
            className="border-t px-3 py-1.5 text-[11px] leading-snug text-[var(--text)]"
            style={{ backgroundColor: "var(--app-bg)", borderColor: tono.border }}
          >
            <span className="font-medium">Comentario: </span>
            {comentario}
          </div>
        )}

        <div
          className="px-3 py-1 text-center text-[11px] font-medium"
          style={{ backgroundColor: tono.foot, color: tono.footText }}
        >
          {RESPONSABLE_DEFECTO}
        </div>
      </div>

      {/* Édition du comentario (admin). */}
      {esAdmin &&
        (comentarioAbierto ? (
          <div className="border-t border-[var(--border)] p-2">
            <textarea
              value={comentario}
              onChange={(e) => onComentario(e.target.value)}
              rows={2}
              placeholder="Comentario…"
              autoFocus
              className="w-full resize-y rounded border border-[var(--border)] p-1.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
            />
            <div className="mt-1 flex justify-end">
              <button
                type="button"
                onClick={onAbrirComentario}
                className="rounded px-2 py-0.5 text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                Listo
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={onAbrirComentario}
            className="flex w-full items-center justify-center gap-1 border-t border-[var(--border)] py-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            {comentario ? "Editar comentario" : "+ Comentario"}
          </button>
        ))}
    </div>
  );
}
