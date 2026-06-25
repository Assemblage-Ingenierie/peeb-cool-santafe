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
// 3) édition admin des cartes : realizada (pilule) + comentario + éditer
//    texte/responsable. ÉTAT LOCAL (non persisté) — stockage DB à venir.
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

// Édition locale d'une carte (admin) : surcharge nom / description / responsable.
interface Edicion {
  nombre?: string;
  descripcion?: string;
  responsable?: string;
}

type Seleccion = "global" | string;
type Vista = "user" | "admin";
type PanelTipo = "comentario" | "editar";

export function HojasDeRutaClient() {
  const snap = useSnapshot();
  const admin = isAdmin(getCurrentUser());
  const [seleccion, setSeleccion] = useState<Seleccion>("global");
  const [vista, setVista] = useState<Vista>("admin");
  const esAdmin = admin && vista === "admin";

  // États d'édition — LOCAUX (non persistés). Clé = `${seleccion}::${card.key}`.
  const [realizadas, setRealizadas] = useState<Set<string>>(new Set());
  const [comentarios, setComentarios] = useState<Record<string, string>>({});
  const [ediciones, setEdiciones] = useState<Record<string, Edicion>>({});
  const [panel, setPanel] = useState<{ key: string; tipo: PanelTipo } | null>(null);
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

  function togglePanel(k: string, tipo: PanelTipo) {
    setPanel((cur) => (cur && cur.key === k && cur.tipo === tipo ? null : { key: k, tipo }));
  }

  function aplicarEdicion(k: string, patch: Edicion) {
    setEdiciones((prev) => ({ ...prev, [k]: { ...prev[k], ...patch } }));
  }

  function restablecerEdicion(k: string) {
    setEdiciones((prev) => {
      const n = { ...prev };
      delete n[k];
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
          <RutaButton key={s.uid} activo={seleccion === s.uid} onClick={() => setSeleccion(s.uid)}>
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
                      "absolute right-4 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]",
                      anoChecked
                        ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                        : "border-[var(--text-muted)] bg-transparent text-transparent hover:text-[var(--text-muted)]",
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
                        edicion={ediciones[k]}
                        esAdmin={esAdmin}
                        panel={panel && panel.key === k ? panel.tipo : null}
                        onToggleRealizada={() => toggleRealizada(k)}
                        onPanel={(tipo) => togglePanel(k, tipo)}
                        onComentario={(v) => setComentarios((prev) => ({ ...prev, [k]: v }))}
                        onEdicion={(patch) => aplicarEdicion(k, patch)}
                        onReset={() => restablecerEdicion(k)}
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
            Modo Admin: marcar realizada, editar texto/responsable y agregar comentario. Cambios
            locales (sin guardar todavía).
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

// Carte de tâche — format validé : en-tête coloré (nom) + corps optionnel + pied
// « Responsable ». Côté admin : pilule « realizada », édition (nom / description /
// responsable) et comentario. Surcharges d'édition locales (non persistées).
function TareaCard({
  card,
  realizada,
  comentario,
  edicion,
  esAdmin,
  panel,
  onToggleRealizada,
  onPanel,
  onComentario,
  onEdicion,
  onReset,
}: {
  card: CardModel;
  realizada: boolean;
  comentario: string;
  edicion: Edicion | undefined;
  esAdmin: boolean;
  panel: PanelTipo | null;
  onToggleRealizada: () => void;
  onPanel: (tipo: PanelTipo) => void;
  onComentario: (v: string) => void;
  onEdicion: (patch: Edicion) => void;
  onReset: () => void;
}) {
  const tono = CARD_TONOS[card.componente];
  const pillVisible = esAdmin || realizada;
  const nombre = edicion?.nombre ?? card.nombre;
  const descripcion = edicion?.descripcion ?? card.descripcion ?? "";
  const responsable = edicion?.responsable ?? RESPONSABLE_DEFECTO;
  const editando = panel === "editar";
  const comentarioAbierto = panel === "comentario";
  const labelStyle = "block text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]";
  const inputStyle =
    "mt-0.5 w-full rounded border border-[var(--border)] p-1 text-[11px] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]";

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
          {nombre}
        </div>

        {descripcion && (
          <div
            className={cn(
              "px-3 py-1.5 text-center text-[11px] leading-snug",
              card.nota && !edicion?.descripcion && "italic",
            )}
            style={{ backgroundColor: tono.body, color: tono.bodyText }}
          >
            {descripcion}
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
          {responsable}
        </div>
      </div>

      {/* Panneaux d'édition (admin) */}
      {esAdmin && editando && (
        <div className="space-y-1.5 border-t border-[var(--border)] p-2">
          <div>
            <label className={labelStyle}>Nombre</label>
            <textarea
              value={nombre}
              onChange={(e) => onEdicion({ nombre: e.target.value })}
              rows={2}
              className={cn(inputStyle, "resize-y")}
            />
          </div>
          <div>
            <label className={labelStyle}>Descripción</label>
            <input
              value={descripcion}
              onChange={(e) => onEdicion({ descripcion: e.target.value })}
              className={inputStyle}
            />
          </div>
          <div>
            <label className={labelStyle}>Responsable</label>
            <input
              value={responsable}
              onChange={(e) => onEdicion({ responsable: e.target.value })}
              className={inputStyle}
            />
          </div>
          <div className="flex items-center justify-between pt-0.5">
            <button
              type="button"
              onClick={onReset}
              className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text)]"
            >
              Restablecer
            </button>
            <button
              type="button"
              onClick={() => onPanel("editar")}
              className="rounded px-2 py-0.5 text-[11px] font-medium text-[var(--text)] hover:bg-[var(--app-bg)]"
            >
              Listo
            </button>
          </div>
        </div>
      )}

      {esAdmin && comentarioAbierto && (
        <div className="border-t border-[var(--border)] p-2">
          <textarea
            value={comentario}
            onChange={(e) => onComentario(e.target.value)}
            rows={2}
            placeholder="Comentario…"
            autoFocus
            className={cn(inputStyle, "resize-y")}
          />
          <div className="mt-1 flex justify-end">
            <button
              type="button"
              onClick={() => onPanel("comentario")}
              className="rounded px-2 py-0.5 text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
            >
              Listo
            </button>
          </div>
        </div>
      )}

      {esAdmin && !editando && !comentarioAbierto && (
        <div className="flex border-t border-[var(--border)] text-[11px] text-[var(--text-muted)]">
          <button
            type="button"
            onClick={() => onPanel("editar")}
            className="flex-1 py-1 transition-colors hover:bg-[var(--app-bg)] hover:text-[var(--text)]"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => onPanel("comentario")}
            className="flex-1 border-l border-[var(--border)] py-1 transition-colors hover:bg-[var(--app-bg)] hover:text-[var(--text)]"
          >
            {comentario ? "Comentario ✓" : "Comentario"}
          </button>
        </div>
      )}
    </div>
  );
}
