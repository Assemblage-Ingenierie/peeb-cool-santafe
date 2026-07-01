"use client";

import type { DragEvent, ReactNode } from "react";
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import {
  FASES,
  COMPONENTES,
  ROADMAP_TAREAS,
  CARD_TONOS,
  RESPONSABLE_DEFECTO,
  REQUISITOS_AYS,
  REQUISITOS_AYS_CODES,
  refMgas,
  type ComponenteCode,
} from "@/lib/constants";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { CheckIcon } from "@/components/icons";
import { useSnapshot } from "@/components/dashboard/use-snapshot";
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
} from "@/app/hojas-de-ruta/actions";

// ============================================================
// Hojas de ruta — page.
// Sous-lots : 1) page + nav + structure ; 2) contenu AyS ; 3) édition admin
// (realizada + comentario + éditer texto/responsable) ; 4) enlazar = flèches de
// dépendance entre cartes. ÉTAT LOCAL (non persisté) — stockage DB à venir.
// ============================================================

const HITO_AFD = "no_objecion_afd";

interface FilaRuta {
  code: string;
  nombre: string;
  hito: boolean;
  numero: number | null;
}

const FILAS_RUTA: FilaRuta[] = [];
{
  let numero = 0;
  for (const f of FASES.filter((x) => x.code !== "general")) {
    const hito = f.code === HITO_AFD;
    if (!hito) numero += 1;
    FILAS_RUTA.push({ code: f.code, nombre: f.nombre, hito, numero: hito ? null : numero });
  }
}

const REQ_LABEL = new Map<string, string>(
  REQUISITOS_AYS.flatMap((g) => g.requisitos.map((r) => [r.code, r.label] as const)),
);

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

// Clé spéciale = case « No objeción AFD recibida » (persistée comme une tâche).
const ANO_KEY = "__ano_afd__";

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
  orden?: number; // clé de tri effective dans la colonne (fila × composante)
}

interface Edicion {
  nombre?: string;
  descripcion?: string;
  responsable?: string;
}

interface Enlace {
  from: string; // statKey source
  to: string; // statKey cible
}

// Override de position d'une carte (drag-drop / cartes créées).
interface Posicion {
  fila: string | null; // phase (sous-projet) / semestre (global) ; null = fila d'origine
  orden: number | null; // clé de tri dans la colonne ; null = ordre par défaut
}

interface Flecha {
  d: string;
  comp: ComponenteCode;
  mx: number;
  my: number;
  idx: number;
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
  const [anoAfd, setAnoAfd] = useState<Record<string, boolean>>({});
  const anoChecked = !!anoAfd[seleccion];

  // Dépendances (flèches) + mode liaison — LOCAUX.
  const [enlaces, setEnlaces] = useState<Enlace[]>([]);
  const [linkFrom, setLinkFrom] = useState<string | null>(null);
  const linking = esAdmin && linkFrom !== null;

  // Gestionnaire de cartes (migration 015). Clés = statKey `${feuille}::${key}`.
  const [ocultas, setOcultas] = useState<Set<string>>(new Set()); // cartes par défaut masquées
  const [creadas, setCreadas] = useState<Record<string, ComponenteCode>>({}); // statKey → composante
  const [posiciones, setPosiciones] = useState<Record<string, Posicion>>({}); // fila/orden override

  // Drag-drop vertical (composante fixe). `drag` = carte en cours ; `dropAt` =
  // emplacement d'insertion aimanté (fila × composante × index).
  const [drag, setDrag] = useState<{ key: string; comp: ComponenteCode } | null>(null);
  const [dropAt, setDropAt] = useState<{ fila: string; comp: ComponenteCode; index: number } | null>(
    null,
  );

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
  const aysRequisitos = snap.status === "ready" ? snap.data.aysRequisitos : [];

  // Charge l'état persisté (realizadas, comentarios, ediciones, anoAfd, enlaces)
  // depuis le snapshot, une seule fois (ajuster l'état pendant le rendu).
  if (!hydrated && snap.status === "ready") {
    const rz = new Set<string>();
    const com: Record<string, string> = {};
    const edi: Record<string, Edicion> = {};
    const ano: Record<string, boolean> = {};
    const ocu = new Set<string>();
    const cre: Record<string, ComponenteCode> = {};
    const pos: Record<string, Posicion> = {};
    for (const r of snap.data.roadmapEstado) {
      const sk = `${r.feuille}::${r.tareaKey}`;
      if (r.tareaKey === ANO_KEY) {
        if (r.realizada) ano[r.feuille] = true;
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
      if (r.fila != null || r.orden != null) pos[sk] = { fila: r.fila, orden: r.orden };
    }
    setRealizadas(rz);
    setComentarios(com);
    setEdiciones(edi);
    setAnoAfd(ano);
    setOcultas(ocu);
    setCreadas(cre);
    setPosiciones(pos);
    setEnlaces(
      snap.data.roadmapEnlace.map((e) => ({
        from: `${e.feuille}::${e.desde}`,
        to: `${e.feuille}::${e.hacia}`,
      })),
    );
    setHydrated(true);
  }

  const activa =
    seleccion === "global"
      ? "Proyecto global"
      : subproyectos.find((s) => s.uid === seleccion)?.nombre ?? seleccion;

  function planesDe(uid: string): { code: string; label: string }[] {
    const checked = new Set(
      aysRequisitos.filter((r) => r.subproyectoUid === uid).map((r) => r.requisito),
    );
    return REQUISITOS_AYS_CODES.filter((c) => checked.has(c)).map((c) => ({
      code: c,
      label: REQ_LABEL.get(c) ?? c,
    }));
  }

  function cardsDeFase(faseCode: string): CardModel[] {
    const out: CardModel[] = [];
    for (const t of ROADMAP_TAREAS) {
      if (t.fase !== faseCode) continue;
      if (!t.dinamica) {
        out.push({
          key: t.id ?? t.nombre,
          componente: t.componente,
          nombre: t.nombre,
          responsable: t.responsable,
          comentario: t.comentario,
        });
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

  // Instances de cartes par colonne (fila × composante), triées par orden.
  // Combine les cartes par défaut (non masquées, position éventuellement
  // surchargée) et les cartes créées. Clé de map = `${fila}|${componente}`.
  function construirColumnas(): Map<string, CardModel[]> {
    const acc = new Map<string, CardModel[]>();
    const add = (fila: string, comp: ComponenteCode, card: CardModel, orden: number) => {
      const key = `${fila}|${comp}`;
      const arr = acc.get(key);
      const c = { ...card, orden };
      if (arr) arr.push(c);
      else acc.set(key, [c]);
    };
    // Cartes par défaut (jamais pour « Proyecto global »).
    if (seleccion !== "global") {
      let idx = 0;
      for (const fila of FILAS_RUTA) {
        if (fila.hito) continue;
        for (const card of cardsDeFase(fila.code)) {
          idx += 1;
          const sk = `${seleccion}::${card.key}`;
          if (ocultas.has(sk)) continue;
          const p = posiciones[sk];
          add(p?.fila ?? fila.code, card.componente, card, p?.orden ?? idx);
        }
      }
    }
    // Cartes créées (identité = statKey ; texte via ediciones/comentarios).
    for (const [sk, comp] of Object.entries(creadas)) {
      const { feuille, tarea } = splitKey(sk);
      if (feuille !== seleccion) continue;
      const p = posiciones[sk];
      if (!p?.fila) continue;
      add(p.fila, comp, { key: tarea, componente: comp, nombre: "" }, p.orden ?? 0);
    }
    for (const arr of acc.values()) {
      arr.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || (a.key < b.key ? -1 : 1));
    }
    return acc;
  }
  const columnas = construirColumnas();
  function cartasColumna(fila: string, comp: ComponenteCode): CardModel[] {
    return columnas.get(`${fila}|${comp}`) ?? [];
  }
  const ocultasFeuille = [...ocultas].filter((sk) => splitKey(sk).feuille === seleccion).length;

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
      setEnlaces((prev) =>
        prev.some((e) => e.from === linkFrom && e.to === toKey)
          ? prev
          : [...prev, { from: linkFrom, to: toKey }],
      );
      const a = splitKey(linkFrom);
      const b = splitKey(toKey);
      roadmapAddEnlace(a.feuille, a.tarea, b.tarea).catch(() => {});
    }
    setLinkFrom(null);
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

  // Crée une carte dans la colonne (fila × composante) et ouvre son édition.
  async function addCard(fila: string, comp: ComponenteCode) {
    const orden = cartasColumna(fila, comp).reduce((m, c) => Math.max(m, c.orden ?? 0), 0) + 1;
    try {
      const key = await roadmapCrearCarta(seleccion, comp, fila, "Nueva tarea", orden);
      const k = `${seleccion}::${key}`;
      setCreadas((p) => ({ ...p, [k]: comp }));
      setPosiciones((p) => ({ ...p, [k]: { fila, orden } }));
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

  // --- Drag-drop des cartes (vertical, composante fixe) ---
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
  }
  // Calcule l'index d'insertion aimanté selon la position du curseur.
  function onColumnaDragOver(
    e: DragEvent<HTMLElement>,
    fila: string,
    comp: ComponenteCode,
    cards: CardModel[],
  ) {
    if (!drag || drag.comp !== comp) return; // composante fixe : drop hors colonne interdit
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const kids = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("[data-cardkey]"));
    let index = cards.length;
    for (let i = 0; i < kids.length; i += 1) {
      const r = kids[i].getBoundingClientRect();
      if (e.clientY < r.top + r.height / 2) {
        index = i;
        break;
      }
    }
    setDropAt((cur) =>
      cur && cur.fila === fila && cur.comp === comp && cur.index === index
        ? cur
        : { fila, comp, index },
    );
  }
  function onColumnaDrop(
    e: DragEvent<HTMLElement>,
    fila: string,
    comp: ComponenteCode,
    cards: CardModel[],
  ) {
    if (!drag || drag.comp !== comp) return;
    e.preventDefault();
    const index =
      dropAt && dropAt.fila === fila && dropAt.comp === comp ? dropAt.index : cards.length;
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
    const po = prev?.orden ?? null;
    const no = next?.orden ?? null;
    let orden: number;
    if (po != null && no != null) orden = (po + no) / 2;
    else if (po != null) orden = po + 1;
    else if (no != null) orden = no - 1;
    else orden = 0;
    const dragKey = drag.key;
    const tarea = splitKey(dragKey).tarea;
    setPosiciones((p) => ({ ...p, [dragKey]: { fila, orden } }));
    roadmapMoverCarta(seleccion, tarea, fila, orden).catch(() => {});
    setDrag(null);
    setDropAt(null);
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
      const comp = (s.getAttribute("data-comp") as ComponenteCode) || "AyS";
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
  ]);

  function renderCard(card: CardModel) {
    const k = `${seleccion}::${card.key}`;
    return (
      <TareaCard
        key={card.key}
        statKey={k}
        card={card}
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

  // Grille des 3 colonnes (EE / Género / AyS) d'une fila (phase ou semestre),
  // partagée par les sous-projets et « Proyecto global ». Bouton d'ajout (admin).
  function columnasGrid(filaCode: string) {
    return (
      <div className="grid flex-1 grid-cols-3 items-start gap-x-4">
        {COLUMNAS.map((comp) => {
          const cards = cartasColumna(filaCode, comp);
          const activo = drag?.comp === comp; // composante fixe : drop dans la même colonne
          const showAt =
            dropAt && dropAt.fila === filaCode && dropAt.comp === comp ? dropAt.index : -1;
          return (
            <div
              key={comp}
              className="flex flex-col items-start gap-2.5"
              onDragOver={activo ? (e) => onColumnaDragOver(e, filaCode, comp, cards) : undefined}
              onDrop={activo ? (e) => onColumnaDrop(e, filaCode, comp, cards) : undefined}
            >
              {cards.map((card, i) => (
                <Fragment key={card.key}>
                  {showAt === i && <DropIndicator />}
                  {renderCard(card)}
                </Fragment>
              ))}
              {showAt === cards.length && <DropIndicator />}
              {esAdmin && (
                <button
                  type="button"
                  onClick={() => addCard(filaCode, comp)}
                  className="w-full max-w-[264px] rounded-md border border-dashed border-[var(--border)] px-2 py-1.5 text-[11px] font-medium text-[var(--text-muted)] transition-colors hover:border-[var(--focus)] hover:text-[var(--text)]"
                >
                  + Añadir tarjeta
                </button>
              )}
            </div>
          );
        })}
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
          <span>Modo enlace: elegí la tarea de destino de la dependencia.</span>
          <button
            type="button"
            onClick={() => setLinkFrom(null)}
            className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm font-medium text-[var(--text)] hover:bg-[var(--app-bg)]"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Hoja de ruta activa */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-[var(--text)]">{activa}</h2>
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

        {/* Estructura vertical de las fases del proyecto */}
        <div
          ref={boxRef}
          className="relative divide-y divide-[var(--border)] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]"
        >
          {seleccion === "global"
            ? SEMESTRES.map((sem) => (
                <div key={sem.code} className="flex items-center gap-4 p-4">
                  <div className="w-28 shrink-0 self-center sm:w-44">
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
            : FILAS_RUTA.map((fila) =>
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
                    onClick={() => {
                      const nuevo = !anoChecked;
                      setAnoAfd((p) => ({ ...p, [seleccion]: nuevo }));
                      roadmapSetAnoAfd(seleccion, nuevo).catch(() => {});
                    }}
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
                <div className="w-28 shrink-0 self-center sm:w-44">
                  <div className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                    Fase {String(fila.numero).padStart(2, "0")}
                  </div>
                  <div className="mt-0.5 text-sm font-semibold leading-snug text-[var(--text)]">
                    {fila.nombre}
                  </div>
                </div>
                {columnasGrid(fila.code)}
              </div>
            ),
          )}

          {/* Overlay des flèches de dépendance */}
          {overlay.flechas.length > 0 && (
            <svg
              className="pointer-events-none absolute left-0 top-0 z-20"
              width={overlay.w}
              height={overlay.h}
              aria-hidden="true"
            >
              <defs>
                {COMPONENTES.map((c) => (
                  <marker
                    key={c.code}
                    id={`ah-${c.code}`}
                    markerWidth="8"
                    markerHeight="8"
                    refX="6"
                    refY="3"
                    orient="auto"
                  >
                    <path d="M0,0 L6,3 L0,6 z" fill={CARD_TONOS[c.code].foot} />
                  </marker>
                ))}
              </defs>
              {overlay.flechas.map((f) => (
                <path
                  key={`f-${f.idx}`}
                  d={f.d}
                  fill="none"
                  stroke={CARD_TONOS[f.comp].foot}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  markerEnd={`url(#ah-${f.comp})`}
                />
              ))}
              {esAdmin &&
                overlay.flechas.map((f) => (
                  <g
                    key={`x-${f.idx}`}
                    className="pointer-events-auto cursor-pointer"
                    onClick={() => removeEnlace(f.idx)}
                  >
                    <title>Eliminar dependencia</title>
                    <circle cx={f.mx} cy={f.my} r="8" fill="#fff" stroke={CARD_TONOS[f.comp].foot} strokeWidth="1.5" />
                    <path
                      d={`M ${f.mx - 3},${f.my - 3} L ${f.mx + 3},${f.my + 3} M ${f.mx + 3},${f.my - 3} L ${f.mx - 3},${f.my + 3}`}
                      stroke={CARD_TONOS[f.comp].foot}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
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

function TareaCard({
  statKey,
  card,
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
  arrastrable,
  arrastrando,
  onDragStart,
  onDragEnd,
}: {
  statKey: string;
  card: CardModel;
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
      style={{ borderColor: tono.border }}
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

        {comentarioEff && (
          <div
            className="border-t px-3 py-1.5 text-[11px] leading-snug text-[var(--text)]"
            style={{ backgroundColor: "var(--app-bg)", borderColor: tono.border }}
          >
            {comentarioEff}
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
