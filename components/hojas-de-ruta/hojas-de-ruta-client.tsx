"use client";

import type { DragEvent, ReactNode } from "react";
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import {
  FASES,
  HITOS_FASE,
  COMPONENTES,
  CARD_TONOS,
  RESPONSABLE_DEFECTO,
  DURACION_UNIDADES,
  type ComponenteCode,
} from "@/lib/constants";
import { construirCartasPorFila, type RoadmapOverride } from "@/lib/roadmap";
import { SUBPROYECTOS_HIPOTETICOS } from "@/lib/subproyectos-hipoteticos";
import {
  computeSchedule,
  faseNodeKey,
  FASE_NODE_PREFIX,
  type ScheduleResult,
  type Punto,
  type Unidad,
} from "@/lib/schedule";
import { formatDuracion } from "@/lib/format";
import { useComponentFilters } from "@/components/filter-context";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { CheckIcon } from "@/components/icons";
import { useSnapshot } from "@/components/dashboard/use-snapshot";
import { useRoadmap } from "@/components/dashboard/use-roadmap";
import {
  roadmapSetRealizada,
  roadmapSetComentario,
  roadmapSetEdicion,
  roadmapSetAnoAfd,
  roadmapAddEnlace,
  roadmapRemoveEnlace,
  roadmapCrearCarta,
  roadmapEliminarCarta,
  roadmapRestaurarOcultas,
  roadmapMoverCarta,
  roadmapSetPlan,
} from "@/app/hojas-de-ruta/actions";

// ============================================================
// Hojas de ruta — page.
// Sous-lots : 1) page + nav + structure ; 2) contenu AyS ; 3) édition admin
// (realizada + comentario + éditer texto/responsable) ; 4) enlazar = flèches de
// dépendance entre cartes. ÉTAT LOCAL (non persisté) — stockage DB à venir.
// ============================================================

const HITO_AFD = "no_objecion_afd";

// Clé spéciale = case « No objeción AFD recibida » (persistée comme une tâche).
const ANO_KEY = "__ano_afd__";

// Jalons (« checks ») insérés APRÈS une phase donnée, propres à la feuille de
// route (PAS dans FASES, constante partagée dashboard/cronograma/export). Chaque
// jalon porte une case admin persistée sous son `anoKey`, sur le même principe
// que « No objeción AFD ». Clés = code de la phase après laquelle insérer.
const HITOS_TRAS_FASE: Record<string, { code: string; nombre: string; anoKey: string }[]> =
  HITOS_FASE.reduce(
    (acc, h) => {
      (acc[h.trasFase] ??= []).push({ code: h.code, nombre: h.nombre, anoKey: h.anoKey });
      return acc;
    },
    {} as Record<string, { code: string; nombre: string; anoKey: string }[]>,
  );

// Toutes les clés persistées des cases de jalon (pour l'hydratation depuis le
// snapshot) : le hito « No objeción AFD » de FASES + ceux insérés après une phase.
const HITO_ANO_KEYS = new Set<string>([
  ANO_KEY,
  ...Object.values(HITOS_TRAS_FASE).flatMap((hs) => hs.map((h) => h.anoKey)),
]);

interface FilaRuta {
  code: string;
  nombre: string;
  hito: boolean;
  numero: number | null;
  anoKey?: string; // tarea_key de la case du jalon (hitos uniquement)
}

const FILAS_RUTA: FilaRuta[] = [];
{
  let numero = 0;
  for (const f of FASES.filter((x) => x.code !== "general")) {
    const hito = f.code === HITO_AFD;
    if (!hito) numero += 1;
    FILAS_RUTA.push({
      code: f.code,
      nombre: f.nombre,
      hito,
      numero: hito ? null : numero,
      anoKey: hito ? ANO_KEY : undefined,
    });
    // Jalons insérés juste après cette phase (No objeción AFD — Atribución/Contrato).
    for (const h of HITOS_TRAS_FASE[f.code] ?? []) {
      FILAS_RUTA.push({ code: h.code, nombre: h.nombre, hito: true, numero: null, anoKey: h.anoKey });
    }
  }
}

// Nom d'affichage d'une phase (pour le panneau de liaison quand la source/cible
// est un nœud de phase).
const FASE_NOMBRE = new Map(FILAS_RUTA.map((f) => [f.code, f.nombre]));

// Couleur (pied) d'une composante pour les flèches ; neutre pour les nœuds de phase.
const COLOR_FASE = "#646b78"; // = UI.textMuted
function footColor(comp: string): string {
  return (CARD_TONOS as Record<string, { foot: string }>)[comp]?.foot ?? COLOR_FASE;
}

// Semestres du calendrier global (S2 2026 → S2 2030). La feuille « Proyecto
// global » utilise cette décomposition en semestres au lieu des phases.
const SEMESTRES: { code: string; label: string }[] = [];
for (let anio = 2026; anio <= 2030; anio += 1) {
  for (const s of [1, 2] as const) {
    if (anio === 2026 && s === 1) continue; // démarre à S2 2026
    SEMESTRES.push({ code: `s${s}-${anio}`, label: `S${s} ${anio}` });
  }
}

// Colonnes de la feuille de route, par composante (gauche → droite). Chaque
// colonne conserve sa place même vide (alignement des cartes par composante).
// GP (Gestión de proyecto) à ajouter ici lorsque son contenu sera défini.
const COLUMNAS: ComponenteCode[] = ["EE", "G", "AyS"];

// Une colonne accepte les cartes de sa composante ; la colonne EE accepte AUSSI
// les cartes GP (Gestión de proyecto) — GP et EE partagent la colonne et l'ordre
// (on peut déposer une GP avant/après une EE). La carte garde sa composante.
function aceptaColumna(dragComp: ComponenteCode, colComp: ComponenteCode): boolean {
  return dragComp === colComp || (colComp === "EE" && dragComp === "GP");
}

// Découpe une clé locale `${feuille}::${tareaKey}` pour la persistance.
function splitKey(sk: string): { feuille: string; tarea: string } {
  const i = sk.indexOf("::");
  return { feuille: sk.slice(0, i), tarea: sk.slice(i + 2) };
}

// Sauvegarde différée (texte) — évite une écriture en base par frappe.
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();
function debouncedSave(key: string, fn: () => void, ms = 600) {
  const prev = saveTimers.get(key);
  if (prev) clearTimeout(prev);
  saveTimers.set(key, setTimeout(fn, ms));
}

interface CardModel {
  key: string;
  componente: ComponenteCode;
  nombre: string;
  descripcion?: string;
  responsable?: string; // défaut (surchargé par l'édition admin) — sinon ACEFE
  comentario?: string; // commentaire par défaut (surchargé par l'édition admin)
  nota?: boolean;
  orden?: number; // clé de tri effective dans la cellule (banda × composante)
  banda?: number; // compartiment horizontal dans la phase (0 par défaut)
}

interface Edicion {
  nombre?: string;
  descripcion?: string;
  responsable?: string;
}

interface Enlace {
  from: string; // statKey source (préalable)
  to: string; // statKey cible (qui en découle)
  punto: Punto; // point d'accroche sur la source (inicio | fin)
  desfaseValor: number; // décalage signé (négatif = avant, positif = après)
  desfaseUnidad: Unidad;
}

// Brouillon d'édition d'une liaison (panneau de choix accroche + décalage).
interface LiaisonDraft {
  from: string;
  to: string;
  punto: Punto;
  desfaseValor: number;
  desfaseUnidad: Unidad;
  editing: boolean; // true = liaison existante en cours d'édition
}

// Override de position d'une carte (drag-drop / cartes créées).
interface Posicion {
  fila: string | null; // phase (sous-projet) / semestre (global) ; null = fila d'origine
  orden: number | null; // clé de tri dans la cellule ; null = ordre par défaut
  banda: number | null; // compartiment horizontal dans la phase ; null = bande 0
}

// Planification d'une tâche (champs indépendants ; durée « estimée »).
interface Plan {
  fechaInicio: string | null;
  fechaFin: string | null;
  durValor: number | null;
  durUnidad: string | null;
}

// Date ISO (YYYY-MM-DD) → DD/MM/YYYY (sans souci de fuseau : chaîne pure).
function fmtFechaCorta(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

// Début du projet — ancre de repli du planning quand une phase n'a pas de date.
const PROJECT_START = "2026-01-01";

// Valide une unité de durée (persistée en texte) vers le type du moteur.
function asUnidad(u: string | null | undefined): Unidad | null {
  return u === "dia" || u === "semana" || u === "mes" ? u : null;
}

const UNIDAD_ABBR: Record<Unidad, string> = { dia: "d", semana: "sem", mes: "mes" };

// Quantité + unité au bon singulier/pluriel (ex. « 1 semana » / « 2 semanas »).
const UNIDAD_LABEL = new Map(DURACION_UNIDADES.map((u) => [u.code, u] as const));
function cantidadTexto(abs: number, unidad: Unidad): string {
  const u = UNIDAD_LABEL.get(unidad);
  return u ? `${abs} ${abs === 1 ? u.singular : u.plural}` : `${abs}`;
}

// Résumé compact d'une liaison pour l'étiquette de la flèche. La dépendance
// simple (fin + 0) ne renvoie rien (l'arête suffit) ; « ∥ » = parallèle.
function resumenEnlace(punto: Punto, valor: number, unidad: Unidad): string {
  if (valor === 0) return punto === "inicio" ? "∥" : "";
  const sign = valor > 0 ? "+" : "−";
  const base = punto === "inicio" ? "ini" : "fin";
  return `${base} ${sign}${Math.abs(valor)}${UNIDAD_ABBR[unidad]}`;
}

interface Flecha {
  d: string;
  comp: string; // ComponenteCode ou "fase" (nœud de phase) → couleur via footColor
  mx: number;
  my: number;
  idx: number;
}

type Seleccion = "global" | string;
type Vista = "user" | "admin";
type PanelTipo = "comentario" | "editar";

export function HojasDeRutaClient() {
  const snap = useSnapshot();
  const rm = useRoadmap();
  const admin = isAdmin(getCurrentUser());
  const filtros = useComponentFilters();
  const [seleccion, setSeleccion] = useState<Seleccion>("global");
  const [vista, setVista] = useState<Vista>("admin");
  const esAdmin = admin && vista === "admin";

  // États d'édition — LOCAUX (non persistés). Clé = `${seleccion}::${card.key}`.
  const [realizadas, setRealizadas] = useState<Set<string>>(new Set());
  const [comentarios, setComentarios] = useState<Record<string, string>>({});
  const [ediciones, setEdiciones] = useState<Record<string, Edicion>>({});
  const [panel, setPanel] = useState<{ key: string; tipo: PanelTipo } | null>(null);
  // Cases « No objeción AFD » (hitos). Clé = `${feuille}::${anoKey}`.
  const [anoAfd, setAnoAfd] = useState<Record<string, boolean>>({});

  // Dépendances (flèches) + mode liaison — LOCAUX.
  const [enlaces, setEnlaces] = useState<Enlace[]>([]);
  const [linkFrom, setLinkFrom] = useState<string | null>(null);
  const [liaisonDraft, setLiaisonDraft] = useState<LiaisonDraft | null>(null);
  // Overlay des flèches de dépendance masqué par défaut (lecture plus claire).
  const [mostrarEnlaces, setMostrarEnlaces] = useState(false);
  const linking = esAdmin && linkFrom !== null;

  // Gestionnaire de cartes (migration 015). Clés = statKey `${feuille}::${key}`.
  const [ocultas, setOcultas] = useState<Set<string>>(new Set()); // cartes par défaut masquées
  const [creadas, setCreadas] = useState<Record<string, ComponenteCode>>({}); // statKey → composante
  const [posiciones, setPosiciones] = useState<Record<string, Posicion>>({}); // fila/orden override
  const [planes, setPlanes] = useState<Record<string, Plan>>({}); // planification par carte

  // Drag-drop (composante fixe). `drag` = carte en cours ; `dropAt` = insertion
  // aimantée dans une cellule (fila × banda × composante × index) ; `dropBanda`
  // = zone « nouvelle bande » survolée (fila × position d'insertion entre bandes).
  const [drag, setDrag] = useState<{ key: string; comp: ComponenteCode } | null>(null);
  const [dropAt, setDropAt] = useState<{
    fila: string;
    banda: number;
    comp: ComponenteCode;
    index: number;
  } | null>(null);
  const [dropBanda, setDropBanda] = useState<{ fila: string; at: number } | null>(null);

  // Hydratation de l'état local depuis le snapshot (une fois prêt).
  const [hydrated, setHydrated] = useState(false);

  // Overlay SVG des flèches (positions mesurées dans le DOM).
  const boxRef = useRef<HTMLDivElement>(null);
  const [overlay, setOverlay] = useState<{ w: number; h: number; flechas: Flecha[] }>({
    w: 0,
    h: 0,
    flechas: [],
  });
  const [tick, setTick] = useState(0);

  const subproyectos = snap.status === "ready" ? snap.data.subproyectos : [];

  // Charge l'état persisté (realizadas, comentarios, ediciones, anoAfd, enlaces)
  // depuis le roadmap, une seule fois (ajuster l'état pendant le rendu). Attend
  // les DEUX sources prêtes (snapshot de base + roadmap servi par /api/roadmap).
  if (!hydrated && snap.status === "ready" && rm.status === "ready") {
    const rz = new Set<string>();
    const com: Record<string, string> = {};
    const edi: Record<string, Edicion> = {};
    const ano: Record<string, boolean> = {};
    const ocu = new Set<string>();
    const cre: Record<string, ComponenteCode> = {};
    const pos: Record<string, Posicion> = {};
    const pla: Record<string, Plan> = {};
    for (const r of rm.data.roadmapEstado) {
      const sk = `${r.feuille}::${r.tareaKey}`;
      if (HITO_ANO_KEYS.has(r.tareaKey)) {
        if (r.realizada) ano[`${r.feuille}::${r.tareaKey}`] = true;
        continue;
      }
      if (r.realizada) rz.add(sk);
      if (r.comentario) com[sk] = r.comentario;
      if (r.nombre != null || r.descripcion != null || r.responsable != null) {
        edi[sk] = {
          ...(r.nombre != null ? { nombre: r.nombre } : {}),
          ...(r.descripcion != null ? { descripcion: r.descripcion } : {}),
          ...(r.responsable != null ? { responsable: r.responsable } : {}),
        };
      }
      if (r.oculta) ocu.add(sk);
      if (r.creada && r.componente) cre[sk] = r.componente as ComponenteCode;
      if (r.fila != null || r.orden != null || r.banda != null) {
        pos[sk] = { fila: r.fila, orden: r.orden, banda: r.banda };
      }
      if (r.fechaInicio != null || r.fechaFin != null || r.durValor != null || r.durUnidad != null) {
        pla[sk] = {
          fechaInicio: r.fechaInicio,
          fechaFin: r.fechaFin,
          durValor: r.durValor,
          durUnidad: r.durUnidad,
        };
      }
    }
    setRealizadas(rz);
    setComentarios(com);
    setEdiciones(edi);
    setAnoAfd(ano);
    setOcultas(ocu);
    setCreadas(cre);
    setPosiciones(pos);
    setPlanes(pla);
    setEnlaces(
      rm.data.roadmapEnlace.map((e) => ({
        from: `${e.feuille}::${e.desde}`,
        to: `${e.feuille}::${e.hacia}`,
        punto: e.punto,
        desfaseValor: e.desfaseValor,
        desfaseUnidad: e.desfaseUnidad,
      })),
    );
    setHydrated(true);
  }

  const activa =
    seleccion === "global"
      ? "Proyecto global"
      : subproyectos.find((s) => s.uid === seleccion)?.nombre ?? seleccion;

  // Instances de cartes par colonne (fila × composante) — modèle partagé
  // (lib/roadmap). On traduit l'état local (ocultas/creadas/posiciones/ediciones)
  // en overrides par tarea_key pour la feuille courante. Mémoïsé : ne se relance
  // que si la feuille ou l'état d'édition change — pas à chaque drag / hover / tick.
  const columnas = useMemo<Map<string, CardModel[]>>(() => {
    const pref = `${seleccion}::`;
    const estado = new Map<string, RoadmapOverride>();
    const ensure = (tarea: string) => {
      let o = estado.get(tarea);
      if (!o) {
        o = {};
        estado.set(tarea, o);
      }
      return o;
    };
    for (const sk of ocultas) if (sk.startsWith(pref)) ensure(splitKey(sk).tarea).oculta = true;
    for (const [sk, comp] of Object.entries(creadas)) {
      if (!sk.startsWith(pref)) continue;
      const o = ensure(splitKey(sk).tarea);
      o.creada = true;
      o.componente = comp;
      o.nombre = ediciones[sk]?.nombre ?? null;
    }
    for (const [sk, p] of Object.entries(posiciones)) {
      if (!sk.startsWith(pref)) continue;
      const o = ensure(splitKey(sk).tarea);
      o.fila = p.fila;
      o.orden = p.orden;
      o.banda = p.banda;
    }
    const subs = snap.status === "ready" ? snap.data.subproyectos : [];
    const sub = subs.find((s) => s.uid === seleccion);
    return construirCartasPorFila({
      esGlobal: seleccion === "global",
      tipologia: sub?.tipologia ?? "",
      uid: seleccion,
      semestres: SEMESTRES.map((s) => s.code),
      estado,
    }) as Map<string, CardModel[]>;
  }, [snap, seleccion, ocultas, creadas, posiciones, ediciones]);
  function cartasColumna(fila: string, comp: ComponenteCode): CardModel[] {
    return columnas.get(`${fila}|${comp}`) ?? [];
  }
  // Cartes affichées dans une colonne. La colonne EE agrège aussi les cartes GP
  // (Gestión de proyecto, gris) : même colonne, même ordre (banda puis orden).
  function cartasColumnaVista(fila: string, comp: ComponenteCode): CardModel[] {
    if (comp !== "EE") return cartasColumna(fila, comp);
    const gp = filtros.has("GP") ? cartasColumna(fila, "GP") : [];
    const ee = filtros.has("EE") ? cartasColumna(fila, "EE") : [];
    return [...gp, ...ee].sort(
      (a, b) =>
        (a.banda ?? 0) - (b.banda ?? 0) ||
        (a.orden ?? 0) - (b.orden ?? 0) ||
        (a.key < b.key ? -1 : 1),
    );
  }
  const ocultasFeuille = [...ocultas].filter((sk) => splitKey(sk).feuille === seleccion).length;

  // Libellé d'une tâche (statKey) — pour le panneau de liaison. Gère les nœuds de
  // phase (clé `__fase__<code>`) → nom de la phase.
  function nombreTarea(statKey: string): string {
    const tarea = splitKey(statKey).tarea;
    if (tarea.startsWith(FASE_NODE_PREFIX)) {
      return FASE_NOMBRE.get(tarea.slice(FASE_NODE_PREFIX.length)) ?? tarea;
    }
    for (const cards of columnas.values()) {
      const c = cards.find((x) => x.key === tarea);
      if (c) return ediciones[statKey]?.nombre ?? c.nombre;
    }
    return tarea;
  }

  // Planning calculé (moteur partagé lib/schedule). Sous-projets uniquement :
  // le Proyecto global n'a pas d'ancre de phase (semestres). Les dates ne sont
  // jamais stockées (convention projet). Mémoïsé : ne se relance que si la donnée,
  // la feuille, les cartes, la planification ou les liaisons changent.
  const schedule = useMemo(
    () =>
      seleccion === "global" || snap.status !== "ready"
      ? null
      : (() => {
          const tasks = [];
          for (const [colKey, cards] of columnas) {
            const fila = colKey.split("|")[0];
            for (const card of cards) {
              if (card.nota) continue;
              const p = planes[`${seleccion}::${card.key}`];
              tasks.push({
                key: card.key,
                fase: fila,
                durValor: p?.durValor ?? null,
                durUnidad: asUnidad(p?.durUnidad),
                fechaInicio: p?.fechaInicio ?? null,
                fechaFin: p?.fechaFin ?? null,
              });
            }
          }
          const links = enlaces
            .filter((e) => splitKey(e.from).feuille === seleccion)
            .map((e) => ({
              desde: splitKey(e.from).tarea,
              hacia: splitKey(e.to).tarea,
              punto: e.punto,
              desfaseValor: e.desfaseValor,
              desfaseUnidad: e.desfaseUnidad,
            }));
          const faseInicio: Record<string, string | null> = {};
          for (const f of snap.data.fases) {
            if (f.subproyecto_uid !== seleccion) continue;
            faseInicio[f.fase] = f.fecha_inicio;
            // Nœud de phase planifiable/enlazable (dates/durée = Gestión de subproyectos).
            tasks.push({
              key: faseNodeKey(f.fase),
              fase: "",
              durValor: f.dur_valor ?? null,
              durUnidad: asUnidad(f.dur_unidad),
              fechaInicio: f.fecha_inicio,
              fechaFin: f.fecha_fin,
            });
          }
          return computeSchedule({ tasks, links, faseInicio, projectStart: PROJECT_START });
        })(),
    [snap, seleccion, columnas, planes, enlaces],
  );

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

  function startLink(k: string) {
    setLinkFrom((cur) => (cur === k ? null : k));
  }

  function completeLink(toKey: string) {
    if (linkFrom && linkFrom !== toKey) {
      // Ne crée pas tout de suite : ouvre le panneau de choix (accroche + décalage).
      const existente = enlaces.find((e) => e.from === linkFrom && e.to === toKey);
      setLiaisonDraft({
        from: linkFrom,
        to: toKey,
        punto: existente?.punto ?? "fin",
        desfaseValor: existente?.desfaseValor ?? 0,
        desfaseUnidad: existente?.desfaseUnidad ?? "dia",
        editing: !!existente,
      });
    }
    setLinkFrom(null);
  }

  // Applique le brouillon de liaison (création ou mise à jour) → état + DB (upsert).
  function applyLiaison() {
    const d = liaisonDraft;
    if (!d) return;
    const item: Enlace = {
      from: d.from,
      to: d.to,
      punto: d.punto,
      desfaseValor: d.desfaseValor,
      desfaseUnidad: d.desfaseUnidad,
    };
    setEnlaces((prev) => {
      const i = prev.findIndex((e) => e.from === d.from && e.to === d.to);
      if (i >= 0) {
        const n = [...prev];
        n[i] = item;
        return n;
      }
      return [...prev, item];
    });
    const a = splitKey(d.from);
    const b = splitKey(d.to);
    roadmapAddEnlace(a.feuille, a.tarea, b.tarea, {
      punto: d.punto,
      desfaseValor: d.desfaseValor,
      desfaseUnidad: d.desfaseUnidad,
    }).catch(() => {});
    setLiaisonDraft(null);
  }

  // Ouvre le panneau sur une liaison existante (clic sur la poignée de la flèche).
  function editEnlace(idx: number) {
    const e = enlaces[idx];
    if (!e) return;
    setLiaisonDraft({
      from: e.from,
      to: e.to,
      punto: e.punto,
      desfaseValor: e.desfaseValor,
      desfaseUnidad: e.desfaseUnidad,
      editing: true,
    });
  }

  function removeEnlace(idx: number) {
    const e = enlaces[idx];
    setEnlaces((prev) => prev.filter((_, i) => i !== idx));
    if (e) {
      const a = splitKey(e.from);
      const b = splitKey(e.to);
      roadmapRemoveEnlace(a.feuille, a.tarea, b.tarea).catch(() => {});
    }
  }

  // Supprime la liaison en cours d'édition depuis le panneau.
  function eliminarLiaisonDraft() {
    const d = liaisonDraft;
    if (!d) return;
    const idx = enlaces.findIndex((e) => e.from === d.from && e.to === d.to);
    if (idx >= 0) removeEnlace(idx);
    setLiaisonDraft(null);
  }

  // Crée une carte dans la colonne (fila × composante) et ouvre son édition.
  // Ajoutée en fin de la dernière bande de la colonne (comportement intuitif).
  async function addCard(fila: string, comp: ComponenteCode) {
    const cards = cartasColumna(fila, comp);
    const banda = cards.reduce((m, c) => Math.max(m, c.banda ?? 0), 0);
    const orden =
      cards.filter((c) => (c.banda ?? 0) === banda).reduce((m, c) => Math.max(m, c.orden ?? 0), 0) +
      1;
    try {
      const key = await roadmapCrearCarta(seleccion, comp, fila, "Nueva tarea", orden, banda);
      const k = `${seleccion}::${key}`;
      setCreadas((p) => ({ ...p, [k]: comp }));
      setPosiciones((p) => ({ ...p, [k]: { fila, orden, banda } }));
      setEdiciones((p) => ({ ...p, [k]: { nombre: "Nueva tarea" } }));
      setPanel({ key: k, tipo: "editar" });
    } catch {
      /* écriture DB : ignore (l'UI reste cohérente au prochain chargement) */
    }
  }

  // Supprime une carte : créée → retrait complet ; par défaut → masquée.
  function eliminarCard(card: CardModel, creada: boolean) {
    const k = `${seleccion}::${card.key}`;
    const etiqueta = ediciones[k]?.nombre ?? card.nombre ?? "esta tarjeta";
    if (!window.confirm(`¿Eliminar «${etiqueta}»?`)) return;
    roadmapEliminarCarta(seleccion, card.key, creada).catch(() => {});
    if (creada) {
      setCreadas((p) => {
        const n = { ...p };
        delete n[k];
        return n;
      });
      setPosiciones((p) => {
        const n = { ...p };
        delete n[k];
        return n;
      });
      setEdiciones((p) => {
        const n = { ...p };
        delete n[k];
        return n;
      });
      setComentarios((p) => {
        const n = { ...p };
        delete n[k];
        return n;
      });
      setRealizadas((p) => {
        const n = new Set(p);
        n.delete(k);
        return n;
      });
      setEnlaces((p) => p.filter((e) => e.from !== k && e.to !== k));
    } else {
      setOcultas((p) => new Set(p).add(k));
    }
  }

  // Restaure toutes les cartes par défaut masquées de la feuille courante.
  function restaurarOcultas() {
    roadmapRestaurarOcultas(seleccion).catch(() => {});
    setOcultas((p) => new Set([...p].filter((sk) => splitKey(sk).feuille !== seleccion)));
  }

  // --- Drag-drop des cartes (composante fixe) ---
  // Deux axes : `orden` (tri dans une cellule banda × composante) et `banda`
  // (compartiment horizontal dans la phase, aligné à travers les colonnes).
  function onCardDragStart(e: DragEvent<HTMLElement>, card: CardModel) {
    setDrag({ key: `${seleccion}::${card.key}`, comp: card.componente });
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", card.key);
    } catch {
      /* certains navigateurs exigent un setData ; sans importance ici */
    }
  }
  function onCardDragEnd() {
    setDrag(null);
    setDropAt(null);
    setDropBanda(null);
  }
  // Persiste la nouvelle position (local + DB) et réinitialise le drag.
  function moverA(fila: string, orden: number, banda: number) {
    if (!drag) return;
    const dragKey = drag.key;
    const tarea = splitKey(dragKey).tarea;
    setPosiciones((p) => ({ ...p, [dragKey]: { fila, orden, banda } }));
    roadmapMoverCarta(seleccion, tarea, fila, orden, banda).catch(() => {});
    setDrag(null);
    setDropAt(null);
    setDropBanda(null);
  }
  // Interpole un `orden` entre deux cartes voisines d'une même cellule.
  function ordenEntre(prev: CardModel | null, next: CardModel | null): number {
    const po = prev?.orden ?? null;
    const no = next?.orden ?? null;
    if (po != null && no != null) return (po + no) / 2;
    if (po != null) return po + 1;
    if (no != null) return no - 1;
    return 0;
  }
  // Calcule l'index d'insertion aimanté (curseur vs. milieu des cartes).
  function indiceInsercion(container: HTMLElement, clientY: number, largo: number): number {
    const kids = Array.from(container.querySelectorAll<HTMLElement>("[data-cardkey]"));
    for (let i = 0; i < kids.length; i += 1) {
      const r = kids[i].getBoundingClientRect();
      if (clientY < r.top + r.height / 2) return i;
    }
    return largo;
  }
  // Drop dans une cellule (banda × composante) : réordonne via `orden`.
  function onCeldaDragOver(
    e: DragEvent<HTMLElement>,
    fila: string,
    banda: number,
    comp: ComponenteCode,
    cards: CardModel[],
  ) {
    if (!drag || !aceptaColumna(drag.comp, comp)) return; // GP acceptée dans la colonne EE
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    const index = indiceInsercion(e.currentTarget, e.clientY, cards.length);
    if (dropBanda) setDropBanda(null);
    setDropAt((cur) =>
      cur && cur.fila === fila && cur.banda === banda && cur.comp === comp && cur.index === index
        ? cur
        : { fila, banda, comp, index },
    );
  }
  function onCeldaDrop(
    e: DragEvent<HTMLElement>,
    fila: string,
    banda: number,
    comp: ComponenteCode,
    cards: CardModel[],
  ) {
    if (!drag || !aceptaColumna(drag.comp, comp)) return;
    e.preventDefault();
    e.stopPropagation();
    const index =
      dropAt && dropAt.fila === fila && dropAt.banda === banda && dropAt.comp === comp
        ? dropAt.index
        : cards.length;
    const esOtro = (c: CardModel) => `${seleccion}::${c.key}` !== drag.key;
    let prev: CardModel | null = null;
    let next: CardModel | null = null;
    for (let i = index - 1; i >= 0; i -= 1) {
      if (esOtro(cards[i])) {
        prev = cards[i];
        break;
      }
    }
    for (let i = index; i < cards.length; i += 1) {
      if (esOtro(cards[i])) {
        next = cards[i];
        break;
      }
    }
    moverA(fila, ordenEntre(prev, next), banda);
  }
  // Zone « nouvelle bande » entre deux strips : la carte forme un compartiment
  // à part. `at` = position d'insertion parmi les bandes triées de la phase.
  function onNuevaBandaDragOver(e: DragEvent<HTMLElement>, fila: string, at: number) {
    if (!drag) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dropAt) setDropAt(null);
    setDropBanda((cur) => (cur && cur.fila === fila && cur.at === at ? cur : { fila, at }));
  }
  function onNuevaBandaDrop(e: DragEvent<HTMLElement>, fila: string, at: number, bandas: number[]) {
    if (!drag) return;
    e.preventDefault();
    const before = at > 0 ? bandas[at - 1] : null;
    const after = at < bandas.length ? bandas[at] : null;
    let banda: number;
    if (before != null && after != null) banda = (before + after) / 2;
    else if (before != null) banda = before + 1;
    else if (after != null) banda = after - 1;
    else banda = 0;
    moverA(fila, 0, banda);
  }
  // Drop en vue filtrée (une seule colonne, sans bandes) : la carte adopte la
  // bande de sa voisine du dessus (sinon celle du dessous) et s'y insère.
  function onColumnaFiltradaDrop(
    e: DragEvent<HTMLElement>,
    fila: string,
    comp: ComponenteCode,
    cards: CardModel[],
  ) {
    if (!drag || !aceptaColumna(drag.comp, comp)) return;
    e.preventDefault();
    const index =
      dropAt && dropAt.fila === fila && dropAt.comp === comp ? dropAt.index : cards.length;
    // GP et EE partagent la colonne et l'ordre → on interpole parmi toutes les
    // cartes voisines (peu importe la composante).
    const elegible = (c: CardModel) => `${seleccion}::${c.key}` !== drag.key;
    let prev: CardModel | null = null;
    let next: CardModel | null = null;
    for (let i = index - 1; i >= 0; i -= 1) {
      if (elegible(cards[i])) {
        prev = cards[i];
        break;
      }
    }
    for (let i = index; i < cards.length; i += 1) {
      if (elegible(cards[i])) {
        next = cards[i];
        break;
      }
    }
    const banda = prev?.banda ?? next?.banda ?? 0;
    // orden interpolé uniquement parmi les cartes de la bande cible.
    const p = prev && (prev.banda ?? 0) === banda ? prev : null;
    const n = next && (next.banda ?? 0) === banda ? next : null;
    moverA(fila, ordenEntre(p, n), banda);
  }
  function onColumnaFiltradaDragOver(
    e: DragEvent<HTMLElement>,
    fila: string,
    comp: ComponenteCode,
    cards: CardModel[],
  ) {
    if (!drag || !aceptaColumna(drag.comp, comp)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const index = indiceInsercion(e.currentTarget, e.clientY, cards.length);
    setDropAt((cur) =>
      cur && cur.fila === fila && cur.comp === comp && cur.index === index
        ? cur
        : { fila, banda: 0, comp, index },
    );
  }

  // Recalcule l'overlay sur redimensionnement de la fenêtre.
  useEffect(() => {
    function onResize() {
      setTick((t) => t + 1);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Mesure la position des cartes liées et construit les chemins des flèches.
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const br = box.getBoundingClientRect();
    const flechas: Flecha[] = [];
    enlaces.forEach((e, idx) => {
      const s = box.querySelector<HTMLElement>(`[data-cardkey="${e.from}"]`);
      const t = box.querySelector<HTMLElement>(`[data-cardkey="${e.to}"]`);
      if (!s || !t) return;
      const sr = s.getBoundingClientRect();
      const tr = t.getBoundingClientRect();
      let x1: number, y1: number, x2: number, y2: number, vert: boolean;
      if (tr.top >= sr.bottom - 1) {
        x1 = sr.left - br.left + sr.width / 2;
        y1 = sr.bottom - br.top;
        x2 = tr.left - br.left + tr.width / 2;
        y2 = tr.top - br.top;
        vert = true;
      } else if (tr.bottom <= sr.top + 1) {
        x1 = sr.left - br.left + sr.width / 2;
        y1 = sr.top - br.top;
        x2 = tr.left - br.left + tr.width / 2;
        y2 = tr.bottom - br.top;
        vert = true;
      } else if (tr.left >= sr.right - 1) {
        x1 = sr.right - br.left;
        y1 = sr.top - br.top + sr.height / 2;
        x2 = tr.left - br.left;
        y2 = tr.top - br.top + tr.height / 2;
        vert = false;
      } else {
        x1 = sr.left - br.left;
        y1 = sr.top - br.top + sr.height / 2;
        x2 = tr.right - br.left;
        y2 = tr.top - br.top + tr.height / 2;
        vert = false;
      }
      const comp = s.getAttribute("data-comp") || "AyS";
      const d = vert
        ? `M ${x1},${y1} C ${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2}`
        : `M ${x1},${y1} C ${(x1 + x2) / 2},${y1} ${(x1 + x2) / 2},${y2} ${x2},${y2}`;
      flechas.push({ d, comp, mx: (x1 + x2) / 2, my: (y1 + y2) / 2, idx });
    });
    // Mesure DOM → état ; deps couvrent tout ce qui change la mise en page.
    setOverlay({ w: br.width, h: br.height, flechas });
  }, [
    enlaces,
    seleccion,
    vista,
    realizadas,
    comentarios,
    ediciones,
    panel,
    tick,
    snap.status,
    posiciones,
    creadas,
    ocultas,
    filtros,
  ]);

  function renderCard(card: CardModel) {
    const k = `${seleccion}::${card.key}`;
    return (
      <TareaCard
        key={card.key}
        statKey={k}
        card={card}
        sched={schedule?.get(card.key)}
        realizada={realizadas.has(k)}
        comentario={comentarios[k] ?? ""}
        edicion={ediciones[k]}
        esAdmin={esAdmin}
        panel={panel && panel.key === k ? panel.tipo : null}
        linking={linking}
        esFuente={linkFrom === k}
        onToggleRealizada={() => {
          const nuevo = !realizadas.has(k);
          toggleRealizada(k);
          roadmapSetRealizada(seleccion, card.key, nuevo).catch(() => {});
        }}
        onPanel={(tipo) => togglePanel(k, tipo)}
        onComentario={(v) => {
          setComentarios((prev) => ({ ...prev, [k]: v }));
          debouncedSave(`com:${k}`, () =>
            roadmapSetComentario(seleccion, card.key, v).catch(() => {}),
          );
        }}
        onEdicion={(patch) => {
          const next = { ...ediciones[k], ...patch };
          setEdiciones((prev) => ({ ...prev, [k]: next }));
          debouncedSave(`edi:${k}`, () =>
            roadmapSetEdicion(
              seleccion,
              card.key,
              next.nombre ?? "",
              next.descripcion ?? "",
              next.responsable ?? "",
            ).catch(() => {}),
          );
        }}
        onReset={() => {
          setEdiciones((prev) => {
            const n = { ...prev };
            delete n[k];
            return n;
          });
          roadmapSetEdicion(seleccion, card.key, "", "", "").catch(() => {});
        }}
        onStartLink={() => startLink(k)}
        onCompleteLink={() => completeLink(k)}
        onCancelLink={() => setLinkFrom(null)}
        creada={!!creadas[k]}
        onEliminar={() => eliminarCard(card, !!creadas[k])}
        plan={planes[k]}
        onPlan={(patch) => {
          const base: Plan = planes[k] ?? {
            fechaInicio: null,
            fechaFin: null,
            durValor: null,
            durUnidad: null,
          };
          const merged: Plan = { ...base, ...patch };
          setPlanes((prev) => ({ ...prev, [k]: merged }));
          debouncedSave(`plan:${k}`, () => roadmapSetPlan(seleccion, card.key, merged).catch(() => {}));
        }}
        arrastrable={esAdmin && !card.nota && !linking && !(panel !== null && panel.key === k)}
        arrastrando={drag?.key === k}
        onDragStart={(e) => onCardDragStart(e, card)}
        onDragEnd={onCardDragEnd}
      />
    );
  }

  // Fine ligne d'insertion aimantée (drop indicator).
  function DropIndicator() {
    return (
      <div
        className="h-1 w-full max-w-[264px] rounded-full bg-[var(--accent)]"
        aria-hidden="true"
      />
    );
  }

  // Commentaire effectif d'une carte (note admin persistée, sinon défaut).
  function comentarioDe(card: CardModel): string {
    return comentarios[`${seleccion}::${card.key}`] || card.comentario || "";
  }

  const botonAnadir = (filaCode: string, comp: ComponenteCode) =>
    esAdmin ? (
      <button
        type="button"
        onClick={() => addCard(filaCode, comp)}
        className="w-full max-w-[264px] rounded-md border border-dashed border-[var(--border)] px-2 py-1.5 text-[11px] font-medium text-[var(--text-muted)] transition-colors hover:border-[var(--focus)] hover:text-[var(--text)]"
      >
        + Añadir tarjeta
      </button>
    ) : null;

  // Grille des colonnes (EE / Género / AyS) d'une fila (phase ou semestre).
  // Vue « Todo » : bandes horizontales (compartiments) × colonnes de composantes ;
  //   les cartes d'une même bande sont alignées → tâches simultanées.
  // Vue par composante (une seule cochée) : cartes + panneau latéral « Comentarios »
  //   (sans bandes ; l'ordre vertical suit banda puis orden).
  function columnasGrid(filaCode: string) {
    // La colonne EE apparaît aussi si seul le filtre GP est actif (cartes GP y logent).
    const cols = COLUMNAS.filter((c) => filtros.has(c) || (c === "EE" && filtros.has("GP")));
    const compSel = cols.length === 1 ? cols[0] : null;

    // --- Vue filtrée sur UNE composante (pas de bandes) ---
    if (compSel) {
      const cards = cartasColumnaVista(filaCode, compSel);
      const activo = drag?.comp === compSel;
      const showAt = dropAt && dropAt.fila === filaCode && dropAt.comp === compSel ? dropAt.index : -1;
      return (
        <div
          className="flex flex-1 flex-col gap-2.5"
          onDragOver={
            activo ? (e) => onColumnaFiltradaDragOver(e, filaCode, compSel, cards) : undefined
          }
          onDrop={activo ? (e) => onColumnaFiltradaDrop(e, filaCode, compSel, cards) : undefined}
        >
          {cards.map((card, i) => (
            <Fragment key={card.key}>
              {showAt === i && <DropIndicator />}
              <div className="flex items-stretch gap-1.5">
                <div className="w-full max-w-[264px] shrink-0">{renderCard(card)}</div>
                <ComentariosPanel comp={compSel} texto={comentarioDe(card)} />
              </div>
            </Fragment>
          ))}
          {showAt === cards.length && <DropIndicator />}
          {filtros.has(compSel) && botonAnadir(filaCode, compSel)}
        </div>
      );
    }

    // --- Vue « Todo » : bandes × composantes ---
    // La colonne EE fusionne GP + EE (même colonne, même ordre) → on peut
    // intercaler une carte GP grise avant/après une carte EE.
    const cardsDeColumna = (comp: ComponenteCode): CardModel[] => {
      if (comp === "EE") {
        const gp = filtros.has("GP") ? cartasColumna(filaCode, "GP") : [];
        const ee = filtros.has("EE") ? cartasColumna(filaCode, "EE") : [];
        return [...gp, ...ee].sort(
          (a, b) =>
            (a.banda ?? 0) - (b.banda ?? 0) ||
            (a.orden ?? 0) - (b.orden ?? 0) ||
            (a.key < b.key ? -1 : 1),
        );
      }
      return filtros.has(comp) ? cartasColumna(filaCode, comp) : [];
    };
    const colCards = new Map<ComponenteCode, CardModel[]>(
      cols.map((comp) => [comp, cardsDeColumna(comp)]),
    );
    // Union des bandes présentes (toutes colonnes) → strips triés.
    const bandaSet = new Set<number>();
    for (const comp of cols) for (const c of colCards.get(comp) ?? []) bandaSet.add(c.banda ?? 0);
    const bandas = [...bandaSet].sort((a, b) => a - b);
    if (bandas.length === 0) bandas.push(0);

    const gridStyle = { gridTemplateColumns: `repeat(${cols.length || 1}, minmax(0,1fr))` };
    const enBanda = (arr: CardModel[], b: number) => arr.filter((c) => (c.banda ?? 0) === b);

    // Cellule droppable (banda × colonne). Vide + drag acceptée → placeholder.
    const celda = (comp: ComponenteCode, banda: number, cards: CardModel[]) => {
      const activo = !!drag && aceptaColumna(drag.comp, comp);
      const showAt =
        dropAt && dropAt.fila === filaCode && dropAt.banda === banda && dropAt.comp === comp
          ? dropAt.index
          : -1;
      return (
        <div
          className={cn(
            "flex flex-col items-start gap-2.5",
            activo &&
              cards.length === 0 &&
              "min-h-[2.75rem] rounded-md border border-dashed border-[var(--border)]",
          )}
          onDragOver={activo ? (e) => onCeldaDragOver(e, filaCode, banda, comp, cards) : undefined}
          onDrop={activo ? (e) => onCeldaDrop(e, filaCode, banda, comp, cards) : undefined}
        >
          {cards.map((card, i) => (
            <Fragment key={card.key}>
              {showAt === i && <DropIndicator />}
              {renderCard(card)}
            </Fragment>
          ))}
          {showAt === cards.length && <DropIndicator />}
        </div>
      );
    };

    // Zone « nouvelle bande » entre strips (visible seulement en cours de drag).
    const nuevaBanda = (at: number) => {
      if (!drag) return null;
      const on = dropBanda?.fila === filaCode && dropBanda?.at === at;
      return (
        <div
          onDragOver={(e) => onNuevaBandaDragOver(e, filaCode, at)}
          onDrop={(e) => onNuevaBandaDrop(e, filaCode, at, bandas)}
          className="relative py-1.5"
        >
          <div className={cn("h-px w-full", on ? "bg-[var(--accent)]" : "bg-[var(--border)]")} />
          {on && (
            <span className="absolute left-2 top-0 -translate-y-1/2 bg-[var(--surface)] px-1 text-[10px] font-medium text-[var(--accent)]">
              Nueva banda
            </span>
          )}
        </div>
      );
    };

    return (
      <div className="flex flex-1 flex-col">
        {nuevaBanda(0)}
        {bandas.map((b, i) => (
          <Fragment key={b}>
            <div className="grid items-start gap-x-4" style={gridStyle}>
              {cols.map((comp) => (
                <Fragment key={comp}>{celda(comp, b, enBanda(colCards.get(comp) ?? [], b))}</Fragment>
              ))}
            </div>
            {nuevaBanda(i + 1)}
          </Fragment>
        ))}
        <div className="grid items-start gap-x-4 pt-1" style={gridStyle}>
          {cols.map((comp) => (
            <div key={comp}>{filtros.has(comp) && botonAnadir(filaCode, comp)}</div>
          ))}
        </div>
      </div>
    );
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
        {/* Écoles factices : boutons DÉSACTIVÉS (feuille de route à définir). */}
        {SUBPROYECTOS_HIPOTETICOS.map((s) => (
          <RutaButton key={s.uid} activo={false} disabled onClick={() => {}}>
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

      {linking && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-[var(--focus)] bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--text)]">
          <span>Modo enlace: elegí la tarea de destino del enlace.</span>
          <button
            type="button"
            onClick={() => setLinkFrom(null)}
            className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm font-medium text-[var(--text)] hover:bg-[var(--app-bg)]"
          >
            Cancelar
          </button>
        </div>
      )}

      {esAdmin && liaisonDraft && (
        <LiaisonPanel
          draft={liaisonDraft}
          desde={nombreTarea(liaisonDraft.from)}
          hacia={nombreTarea(liaisonDraft.to)}
          onChange={(patch) => setLiaisonDraft((d) => (d ? { ...d, ...patch } : d))}
          onApply={applyLiaison}
          onCancel={() => setLiaisonDraft(null)}
          onDelete={eliminarLiaisonDraft}
        />
      )}

      {/* Hoja de ruta activa */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-[var(--text)]">{activa}</h2>
          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text)]">
              <input
                type="checkbox"
                checked={mostrarEnlaces}
                onChange={(e) => setMostrarEnlaces(e.target.checked)}
                className="h-3.5 w-3.5 accent-[var(--focus)]"
              />
              Mostrar dependencias
            </label>
            {esAdmin && ocultasFeuille > 0 && (
              <button
                type="button"
                onClick={restaurarOcultas}
                className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
              >
                {ocultasFeuille} tarjeta(s) oculta(s) · Restaurar
              </button>
            )}
          </div>
        </div>

        {/* Estructura vertical de las fases del proyecto */}
        <div
          ref={boxRef}
          className="relative divide-y-2 divide-[var(--border)] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]"
        >
          {seleccion === "global"
            ? SEMESTRES.map((sem) => (
                <div key={sem.code} className="flex items-start gap-4 p-4">
                  <div className="w-28 shrink-0 self-start rounded-md bg-[var(--app-bg)] px-3 py-2 sm:w-44">
                    <div className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                      Semestre
                    </div>
                    <div className="mt-0.5 text-sm font-semibold leading-snug text-[var(--text)]">
                      {sem.label}
                    </div>
                  </div>
                  {columnasGrid(sem.code)}
                </div>
              ))
            : FILAS_RUTA.map((fila) => {
                // Nœud de phase : planifiable (dates/durée de Gestión) + enlazable.
                const faseStatKey = `${seleccion}::${faseNodeKey(fila.code)}`;
                const faseSched = schedule?.get(faseNodeKey(fila.code));
                const esFuenteFase = linkFrom === faseStatKey;
                const inicioF = fmtFechaCorta(faseSched?.start);
                const finF = fmtFechaCorta(faseSched?.end);
                const rangoF = inicioF
                  ? finF && finF !== inicioF
                    ? `${inicioF} → ${finF}`
                    : inicioF
                  : null;
                const fechaFase = rangoF && (
                  <span
                    className={cn(
                      "text-[10px] text-[var(--text-muted)]",
                      faseSched?.startFijada && "font-medium text-[var(--accent)]",
                    )}
                    title={faseSched?.startFijada ? "Inicio fijado a mano (Gestión)" : "Inicio calculado"}
                  >
                    {rangoF}
                    {faseSched?.startFijada ? " 📌" : ""}
                  </span>
                );
                const enlazarFase =
                  esAdmin && !linking ? (
                    <button
                      type="button"
                      onClick={() => startLink(faseStatKey)}
                      className="text-[10px] font-medium text-[var(--text-muted)] underline-offset-2 transition-colors hover:text-[var(--focus)] hover:underline"
                    >
                      Enlazar
                    </button>
                  ) : null;
                const overlayFase = linking && (
                  <button
                    type="button"
                    onClick={esFuenteFase ? () => setLinkFrom(null) : () => completeLink(faseStatKey)}
                    className="absolute inset-0 z-30 flex items-center justify-center rounded border-2 text-[11px] font-semibold"
                    style={
                      esFuenteFase
                        ? { backgroundColor: "rgba(227,5,19,0.10)", borderColor: "var(--accent)", color: "var(--accent)" }
                        : { backgroundColor: "rgba(60,120,216,0.12)", borderColor: "var(--focus)", color: "var(--focus)" }
                    }
                  >
                    {esFuenteFase ? "Cancelar" : "Elegir destino"}
                  </button>
                );

                if (fila.hito) {
                  const anoKey = fila.anoKey ?? ANO_KEY;
                  const checked = !!anoAfd[`${seleccion}::${anoKey}`];
                  return (
              <div
                key={fila.code}
                data-cardkey={faseStatKey}
                data-comp="fase"
                className="relative flex items-center justify-center gap-3 bg-[var(--app-bg)] px-12 py-3"
              >
                <span className="h-px w-8 bg-[var(--border)]" aria-hidden="true" />
                <span
                  className={cn(
                    "text-xs font-semibold uppercase tracking-wide transition-colors",
                    checked ? "text-[var(--focus)]" : "text-[var(--text-muted)]",
                  )}
                >
                  {fila.nombre}
                </span>
                {fechaFase}
                <span className="h-px w-8 bg-[var(--border)]" aria-hidden="true" />
                {enlazarFase && (
                  <span className="absolute left-4 top-1/2 -translate-y-1/2">{enlazarFase}</span>
                )}
                {esAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      const nuevo = !checked;
                      setAnoAfd((p) => ({ ...p, [`${seleccion}::${anoKey}`]: nuevo }));
                      roadmapSetAnoAfd(seleccion, anoKey, nuevo).catch(() => {});
                    }}
                    aria-pressed={checked}
                    aria-label="No objeción AFD recibida"
                    title="No objeción AFD recibida"
                    className={cn(
                      "absolute right-4 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]",
                      checked
                        ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                        : "border-[var(--text-muted)] bg-transparent text-transparent hover:text-[var(--text-muted)]",
                    )}
                  >
                    <CheckIcon className="h-3.5 w-3.5" />
                  </button>
                )}
                {overlayFase}
              </div>
                  );
                }
                return (
              <div key={fila.code} className="flex items-start gap-4 p-4">
                <div
                  data-cardkey={faseStatKey}
                  data-comp="fase"
                  className="relative w-28 shrink-0 self-start rounded-md bg-[var(--app-bg)] px-3 py-2 sm:w-44"
                >
                  <div className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                    Fase {String(fila.numero).padStart(2, "0")}
                  </div>
                  <div className="mt-0.5 text-sm font-semibold leading-snug text-[var(--text)]">
                    {fila.nombre}
                  </div>
                  {fechaFase && <div className="mt-1">{fechaFase}</div>}
                  {enlazarFase && <div className="mt-0.5">{enlazarFase}</div>}
                  {overlayFase}
                </div>
                {columnasGrid(fila.code)}
              </div>
                );
              })}

          {/* Overlay des flèches de dépendance (masqué par défaut, via la case). */}
          {mostrarEnlaces && overlay.flechas.length > 0 && (
            <svg
              className="pointer-events-none absolute left-0 top-0 z-20"
              width={overlay.w}
              height={overlay.h}
              aria-hidden="true"
            >
              <defs>
                {[...COMPONENTES.map((c) => c.code), "fase"].map((code) => (
                  <marker
                    key={code}
                    id={`ah-${code}`}
                    markerWidth="8"
                    markerHeight="8"
                    refX="6"
                    refY="3"
                    orient="auto"
                  >
                    <path d="M0,0 L6,3 L0,6 z" fill={footColor(code)} />
                  </marker>
                ))}
              </defs>
              {overlay.flechas.map((f) => (
                <path
                  key={`f-${f.idx}`}
                  d={f.d}
                  fill="none"
                  stroke={footColor(f.comp)}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  markerEnd={`url(#ah-${f.comp})`}
                />
              ))}
              {/* Étiquette compacte du type de liaison (parallèle / décalage). */}
              {overlay.flechas.map((f) => {
                const e = enlaces[f.idx];
                if (!e) return null;
                const txt = resumenEnlace(e.punto, e.desfaseValor, e.desfaseUnidad);
                if (!txt) return null;
                return (
                  <g key={`lbl-${f.idx}`}>
                    <rect
                      x={f.mx - (txt.length * 3.2 + 4)}
                      y={f.my - 18}
                      width={txt.length * 6.4 + 8}
                      height={12}
                      rx={2}
                      fill="#fff"
                      opacity={0.85}
                    />
                    <text
                      x={f.mx}
                      y={f.my - 9}
                      textAnchor="middle"
                      fontSize="8.5"
                      fill={footColor(f.comp)}
                    >
                      {txt}
                    </text>
                  </g>
                );
              })}
              {esAdmin &&
                overlay.flechas.map((f) => (
                  <g
                    key={`h-${f.idx}`}
                    className="pointer-events-auto cursor-pointer"
                    onClick={() => editEnlace(f.idx)}
                  >
                    <title>Editar enlace</title>
                    <circle cx={f.mx} cy={f.my} r="7" fill="#fff" stroke={footColor(f.comp)} strokeWidth="1.5" />
                    <circle cx={f.mx} cy={f.my} r="2.5" fill={footColor(f.comp)} />
                  </g>
                ))}
            </svg>
          )}
        </div>

        {admin && (
          <p className="text-xs text-[var(--text-muted)]">
            Modo Admin: marcar realizada, editar texto/responsable, comentario y enlazar
            dependencias. Cambios locales (sin guardar todavía).
          </p>
        )}
      </section>
    </div>
  );
}

// Panneau latéral « Comentarios » (vue par composante). En-tête coloré de la
// composante ; corps = commentaire de la carte (ou « — »).
function ComentariosPanel({ comp, texto }: { comp: ComponenteCode; texto: string }) {
  const tono = CARD_TONOS[comp];
  // Cadre complet (contour entier), à peine détaché de la carte (écart minime) ;
  // polices et hauteur de bandeau alignées sur la carte (en-tête 12.5px, corps 11px).
  // En-tête dans le ton CLAIR de la composante (comme l'en-tête de la carte) —
  // plus léger que l'ancien bandeau foncé, séparé du corps par un filet.
  return (
    <div
      className="flex-1 overflow-hidden rounded-md border"
      style={{ borderColor: tono.border }}
    >
      <div
        className="px-3 py-1.5 text-[12.5px] font-semibold leading-snug"
        style={{ backgroundColor: tono.head, color: tono.headText, borderBottom: `1px solid ${tono.border}` }}
      >
        Comentarios
      </div>
      <div className="whitespace-pre-line px-3 py-1.5 text-[11px] leading-snug text-[var(--text)]">
        {texto ? texto : <span className="text-[var(--text-muted)]">—</span>}
      </div>
    </div>
  );
}

function RutaButton({
  activo,
  onClick,
  children,
  disabled = false,
}: {
  activo: boolean;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={activo}
      title={disabled ? "Subproyecto hipotético — por definir" : undefined}
      className={cn(
        "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]",
        disabled
          ? "cursor-not-allowed border border-dashed border-[var(--border)] bg-[var(--app-bg)] italic text-[var(--text-muted)] opacity-60"
          : activo
            ? "bg-[var(--text)] text-white"
            : "border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--text-muted)] hover:text-[var(--text)]",
      )}
    >
      {children}
    </button>
  );
}

// Panneau de choix d'une liaison : raccourcis Paralela / Dependencia, ou réglage
// fin de la source, décalage signé (antes/después) et unité.
function LiaisonPanel({
  draft,
  desde,
  hacia,
  onChange,
  onApply,
  onCancel,
  onDelete,
}: {
  draft: LiaisonDraft;
  desde: string;
  hacia: string;
  onChange: (patch: Partial<LiaisonDraft>) => void;
  onApply: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const esParalela = draft.punto === "inicio" && draft.desfaseValor === 0;
  const esDependencia = draft.punto === "fin" && draft.desfaseValor === 0;
  const abs = Math.abs(draft.desfaseValor);
  const sentido = draft.desfaseValor < 0 ? "antes" : "despues";
  // Résumé en langage clair (A = 1ʳᵉ carte cliquée, B = 2ᵉ = la dépendante).
  const frase =
    abs === 0
      ? draft.punto === "inicio"
        ? "B empieza junto con A (mismo inicio)."
        : "B empieza cuando termina A."
      : `B empieza ${cantidadTexto(abs, draft.desfaseUnidad)} ${
          draft.desfaseValor > 0 ? "después" : "antes"
        } ${draft.punto === "inicio" ? "del inicio de A" : "del fin de A"}.`;
  const badge = (letra: string) => (
    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[var(--text)] text-[9px] font-bold text-white">
      {letra}
    </span>
  );
  const sel =
    "rounded border border-[var(--border)] bg-[var(--surface)] p-1 text-xs text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]";
  const presetCls = (on: boolean) =>
    cn(
      "rounded-md border px-3 py-1 text-xs font-medium transition-colors",
      on
        ? "border-[var(--focus)] bg-[var(--focus)] text-white"
        : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)]",
    );

  return (
    <div className="flex flex-col gap-2 rounded-md border border-[var(--focus)] bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--text)]">
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium">{draft.editing ? "Editar enlace" : "Nuevo enlace"}</span>
      </div>

      {/* Définition de A (1ʳᵉ carte cliquée) et B (2ᵉ = la dépendante). */}
      <div className="flex flex-col gap-0.5 text-xs text-[var(--text-muted)]">
        <span className="flex items-center gap-1.5">
          {badge("A")} <span className="truncate text-[var(--text)]">{desde}</span>
        </span>
        <span className="flex items-center gap-1.5">
          {badge("B")} <span className="truncate text-[var(--text)]">{hacia}</span>
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onChange({ punto: "inicio", desfaseValor: 0 })}
          title="B empieza a la vez que A"
          className={presetCls(esParalela)}
        >
          Paralela
        </button>
        <button
          type="button"
          onClick={() => onChange({ punto: "fin", desfaseValor: 0 })}
          title="B empieza cuando termina A"
          className={presetCls(esDependencia)}
        >
          Dependencia
        </button>

        <span className="mx-1 h-4 w-px bg-[var(--border)]" aria-hidden="true" />

        <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
          {badge("B")} empieza al
        </span>
        <select
          value={draft.punto}
          onChange={(e) => onChange({ punto: e.target.value as Punto })}
          className={sel}
        >
          <option value="inicio">inicio</option>
          <option value="fin">fin</option>
        </select>
        <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
          de {badge("A")},
        </span>
        <input
          type="number"
          min={0}
          value={abs}
          onChange={(e) => {
            const n = Number(e.target.value);
            const val = Number.isNaN(n) ? 0 : Math.max(0, Math.trunc(n));
            onChange({ desfaseValor: sentido === "antes" ? -val : val });
          }}
          className={cn(sel, "w-14")}
        />
        <select
          value={draft.desfaseUnidad}
          onChange={(e) => onChange({ desfaseUnidad: e.target.value as Unidad })}
          className={sel}
        >
          {DURACION_UNIDADES.map((u) => (
            <option key={u.code} value={u.code}>
              {u.plural}
            </option>
          ))}
        </select>
        <select
          value={sentido}
          onChange={(e) => onChange({ desfaseValor: e.target.value === "antes" ? -abs : abs })}
          className={sel}
          disabled={abs === 0}
        >
          <option value="despues">después</option>
          <option value="antes">antes</option>
        </select>
      </div>

      {/* Résumé en clair du lien (se met à jour en direct). */}
      <p className="text-xs italic text-[var(--text)]">{frase}</p>

      <div className="flex items-center justify-end gap-2">
        {draft.editing && (
          <button
            type="button"
            onClick={onDelete}
            className="mr-auto rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-medium text-red-600 transition-colors hover:border-red-500 hover:bg-red-500 hover:text-white"
          >
            Eliminar
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onApply}
          className="rounded-md border border-[var(--focus)] bg-[var(--focus)] px-3 py-1 text-xs font-medium text-white"
        >
          {draft.editing ? "Guardar" : "Crear"}
        </button>
      </div>
    </div>
  );
}

function TareaCard({
  statKey,
  card,
  sched,
  realizada,
  comentario,
  edicion,
  esAdmin,
  panel,
  linking,
  esFuente,
  onToggleRealizada,
  onPanel,
  onComentario,
  onEdicion,
  onReset,
  onStartLink,
  onCompleteLink,
  onCancelLink,
  creada,
  onEliminar,
  plan,
  onPlan,
  arrastrable,
  arrastrando,
  onDragStart,
  onDragEnd,
}: {
  statKey: string;
  card: CardModel;
  sched: ScheduleResult | undefined;
  realizada: boolean;
  comentario: string;
  edicion: Edicion | undefined;
  esAdmin: boolean;
  panel: PanelTipo | null;
  linking: boolean;
  esFuente: boolean;
  onToggleRealizada: () => void;
  onPanel: (tipo: PanelTipo) => void;
  onComentario: (v: string) => void;
  onEdicion: (patch: Edicion) => void;
  onReset: () => void;
  onStartLink: () => void;
  onCompleteLink: () => void;
  onCancelLink: () => void;
  creada: boolean;
  onEliminar: () => void;
  plan: Plan | undefined;
  onPlan: (patch: Partial<Plan>) => void;
  arrastrable: boolean;
  arrastrando: boolean;
  onDragStart: (e: DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
}) {
  const tono = CARD_TONOS[card.componente];
  const pillVisible = esAdmin || realizada;
  const nombre = edicion?.nombre ?? card.nombre;
  const descripcion = edicion?.descripcion ?? card.descripcion ?? "";
  const responsable = edicion?.responsable ?? card.responsable ?? RESPONSABLE_DEFECTO;
  // Commentaire affiché = note admin persistée si présente, sinon défaut de la carte.
  const comentarioEff = comentario || card.comentario || "";
  const editando = panel === "editar";
  const comentarioAbierto = panel === "comentario";
  // Début affiché = date CALCULÉE par le moteur (sinon, faute de planning — ex.
  // Proyecto global —, la date fixée à la main). `startFijada` = ancre manuelle.
  const inicioTexto = fmtFechaCorta(sched ? sched.start : plan?.fechaInicio);
  const finTexto = fmtFechaCorta(sched?.end);
  const inicioFijada = sched ? sched.startFijada : !!plan?.fechaInicio;
  const durTexto = formatDuracion(plan?.durValor, plan?.durUnidad);
  const labelStyle = "block text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]";
  const inputStyle =
    "mt-0.5 w-full rounded border border-[var(--border)] p-1 text-[11px] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]";

  return (
    <div
      data-cardkey={statKey}
      data-comp={card.componente}
      draggable={arrastrable}
      onDragStart={arrastrable ? onDragStart : undefined}
      onDragEnd={arrastrable ? onDragEnd : undefined}
      className={cn(
        "relative w-full max-w-[264px] rounded-md border",
        esFuente && "ring-2 ring-[var(--accent)]",
        arrastrable && "cursor-grab active:cursor-grabbing",
        arrastrando && "opacity-40",
      )}
      // Carte réalisée : on retire le liseré de contour (transparent, mais on
      // garde le `border` pour ne pas décaler la mise en page d'1px).
      style={{ borderColor: realizada ? "transparent" : tono.border }}
    >
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
            "absolute right-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]",
            realizada
              ? "border-transparent text-white"
              : "border-[var(--text-muted)] bg-[var(--surface)] text-transparent",
            esAdmin && "cursor-pointer",
            esAdmin && !realizada && "hover:text-[var(--text-muted)]",
          )}
          style={realizada ? { backgroundColor: tono.foot } : undefined}
        >
          <CheckIcon className="h-3 w-3" />
        </button>
      )}

      {/* Suppression (admin) — coin haut-gauche, hors du calque atténué. */}
      {esAdmin && (
        <button
          type="button"
          onClick={onEliminar}
          aria-label={creada ? "Eliminar tarjeta" : "Ocultar tarjeta"}
          title={creada ? "Eliminar" : "Ocultar"}
          className="absolute left-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded border-2 border-[var(--text-muted)] bg-[var(--surface)] text-[var(--text-muted)] transition-colors hover:border-red-500 hover:bg-red-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
        >
          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" aria-hidden="true">
            <path d="M1 1 L11 11 M11 1 L1 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      )}

      {/* Contenu — atténué quand realizada (la pilule reste nette). */}
      <div className={cn("flex flex-col overflow-hidden rounded-md", realizada && "opacity-45")}>
        <div
          className={cn(
            "py-2 text-center text-[12.5px] font-semibold leading-snug",
            esAdmin ? "px-9" : "px-3 pr-9",
          )}
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

        {/* Le commentaire n'est plus affiché sur la carte : masqué en vue « Todo »,
            montré dans le panneau latéral « Comentarios » en vue par composante. */}

        {/* Planificación (inicio calculado + duración estimada) — au-dessus du
            responsable. Début en accent + repère si fijado a mano ; « ⚠ » si la
            tâche est prise dans une boucle de dépendances (enlace ignoré). */}
        <div className="flex flex-wrap items-center justify-center gap-x-2 border-t px-3 py-1 text-[10px] text-[var(--text-muted)]"
          style={{ backgroundColor: "var(--app-bg)", borderColor: tono.border }}
        >
          <span
            className={cn(inicioFijada && "font-medium text-[var(--accent)]")}
            title={
              inicioFijada
                ? "Inicio fijado a mano"
                : sched
                  ? "Inicio calculado (duración y enlaces)"
                  : undefined
            }
          >
            {inicioTexto ? `Inicio: ${inicioTexto}` : "Inicio: —"}
            {inicioFijada ? " 📌" : ""}
          </span>
          {sched && finTexto && sched.end !== sched.start && (
            <>
              <span aria-hidden="true">→</span>
              <span title={sched.finFijada ? "Fin fijado a mano (excedente)" : "Fin calculado"}>
                {finTexto}
              </span>
            </>
          )}
          <span aria-hidden="true">·</span>
          <span>{durTexto ?? "—"}</span>
          {sched?.enCiclo && (
            <span className="text-amber-600" title="En un ciclo de dependencias: se ignoró un enlace">
              ⚠
            </span>
          )}
        </div>

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
          <div>
            <label className={labelStyle}>Fecha inicio</label>
            <input
              type="date"
              value={plan?.fechaInicio ?? ""}
              onChange={(e) => onPlan({ fechaInicio: e.target.value || null })}
              className={inputStyle}
            />
          </div>
          <div>
            <label className={labelStyle}>Duración estimada</label>
            <div className="mt-0.5 flex gap-1">
              <input
                type="number"
                min={1}
                value={plan?.durValor ?? ""}
                onChange={(e) =>
                  onPlan({ durValor: e.target.value === "" ? null : Number(e.target.value) })
                }
                className="w-14 rounded border border-[var(--border)] p-1 text-[11px] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
              />
              <select
                value={plan?.durUnidad ?? ""}
                onChange={(e) => onPlan({ durUnidad: e.target.value || null })}
                className="flex-1 rounded border border-[var(--border)] p-1 text-[11px] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
              >
                <option value="">—</option>
                {DURACION_UNIDADES.map((u) => (
                  <option key={u.code} value={u.code}>
                    {u.plural}
                  </option>
                ))}
              </select>
            </div>
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
            {comentarioEff ? "Comentario ✓" : "Comentario"}
          </button>
          <button
            type="button"
            onClick={onStartLink}
            className="flex-1 border-l border-[var(--border)] py-1 transition-colors hover:bg-[var(--app-bg)] hover:text-[var(--text)]"
          >
            Enlazar
          </button>
        </div>
      )}

      {/* Surcouche du mode liaison : la carte source = Cancelar ; les autres = Elegir. */}
      {linking && (
        <button
          type="button"
          onClick={esFuente ? onCancelLink : onCompleteLink}
          className="absolute inset-0 z-30 flex items-center justify-center rounded-md border-2 text-[11px] font-semibold"
          style={
            esFuente
              ? { backgroundColor: "rgba(227,5,19,0.10)", borderColor: "var(--accent)", color: "var(--accent)" }
              : { backgroundColor: "rgba(60,120,216,0.12)", borderColor: "var(--focus)", color: "var(--focus)" }
          }
        >
          {esFuente ? "Cancelar" : "Elegir destino"}
        </button>
      )}
    </div>
  );
}
