"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import {
  CARD_TONOS,
  GESTION_FASES,
  HITO_COLOR,
  HITO_CNO_PREFIX,
  GP_BARRA,
  UI,
  esModeloEnvolvente,
  type ComponenteCode,
} from "@/lib/constants";
import {
  FASES_ORD,
  FASE_SIGLA,
  LEYENDA_FASES,
  colorDeFase,
  colorFase,
  textoSobre,
} from "@/lib/fases-cronograma";
import {
  construirCartasPorFila,
  lineasHito,
  type LineaHito,
  type RoadmapOverride,
} from "@/lib/roadmap";
import { SEMESTRES_CODES, planGlobalEfectivo, type PlanStored } from "@/lib/semestres";
import {
  computeSchedule,
  faseNodeKey,
  type ScheduleResult,
  type ScheduleTask,
  type Unidad,
} from "@/lib/schedule";
import {
  FEUILLE_PAG,
  PAG_ACCIONES,
  PAG_EJES,
  PAG_FASE_NOMBRE,
  PAG_HITOS,
  PAG_RELLENO,
  PAG_RESPONSABLES,
  PAG_RESP_NOMBRE,
  accionesDeEje,
  pagTareaKey,
  type PagAccion,
  type PagHito,
} from "@/lib/pag";
import { useSnapshot } from "@/components/dashboard/use-snapshot";
import { useRoadmap } from "@/components/dashboard/use-roadmap";
import { HojaSelector, type SubOpcion } from "@/components/subproyecto-select";
import type { Roadmap, Snapshot, SnapshotRoadmapEstado } from "@/lib/snapshot";

// Données combinées consommées par le Gantt : snapshot de base + roadmap
// (chargés par deux endpoints séparés, fusionnés côté client).
type DatosCronograma = Snapshot & Roadmap;
import { useComponentFilters } from "@/components/filter-context";
import { isAdmin } from "@/lib/auth";
import { useAuthUser } from "@/components/auth-context";
import { roadmapSetRealizada } from "@/app/hojas-de-ruta/actions";

// ============================================================
// Cronograma (Gantt) — branché sur le MOTEUR de planning (lib/schedule) : les
// barres sont positionnées par les dates CALCULÉES (durées + liaisons + ancres de
// phase), identiques à la feuille de route. Barre PLEINE = durée estimée ;
// excédent HACHURÉ = jusqu'à la fecha_fin. Axe : semana / mes / trimestre.
//   • Sous-projet : section « Fases » (barres de phase) + une section par
//     composante (cartes), filtrées par « Vista / Rol ».
//   • Proyecto global : une ligne par sous-projet (durée totale calculée).
// ============================================================

type Gran = "semana" | "mes" | "trimestre";
type Seleccion = "global" | string;

const PROJECT_START = "2026-01-01";

// Fenêtre temporelle affichée : 2026 → 2031 inclus.
const ANIO_INI = 2026;
const ANIO_FIN = 2031;
const START = new Date(ANIO_INI, 0, 1).getTime();
const END = new Date(ANIO_FIN + 1, 0, 1).getTime();
const SPAN = END - START;

const LABEL_W = 300;
const ROW_H = 28;
// Largeur d'UNE case, IDENTIQUE quelle que soit la granularité : changer de
// vue = zoomer (une case de trimestre fait la même largeur qu'une case de mois
// ou de semaine). Le nombre de cases change (≈20 en trimestre, 60 en mes, 260
// en semana) → plus la granularité est fine, plus l'échelle est « zoomée ».
const CELL_W = 56;
// Repli de visibilité au chargement si « hoy » est hors fenêtre (auto-scroll).
const VISTA_INICIO = new Date(2026, 5, 1).getTime(); // juin 2026
// Espacement par défaut de la barre rouge « hoy » depuis la colonne des titres,
// exprimé en cases (laisse un court passé visible à gauche au chargement).
const OFFSET_HOY_CASES = 3.5;
const MES_ABBR = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// Couleurs, sigles et helpers des fases : source unique dans lib/fases-cronograma
// (partagée avec le tracker « Fases en curso » de l'Inicio).
// Composantes en sections (ordre d'affichage).
const COMPS: ComponenteCode[] = ["GP", "EE", "AyS", "G"];

const asUnidad = (u: string | null | undefined): Unidad | null =>
  u === "dia" || u === "semana" || u === "mes" ? u : null;

// Date ISO (YYYY-MM-DD) → ms locaux.
function isoMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime() : null;
}

interface UnidadEje {
  start: number;
  label: string;
  anio: number;
}

function construirUnidades(gran: Gran): UnidadEje[] {
  const out: UnidadEje[] = [];
  if (gran === "trimestre") {
    for (let y = ANIO_INI; y <= ANIO_FIN; y += 1)
      for (let q = 0; q < 4; q += 1)
        out.push({ start: new Date(y, q * 3, 1).getTime(), label: `T${q + 1}`, anio: y });
  } else if (gran === "mes") {
    for (let y = ANIO_INI; y <= ANIO_FIN; y += 1)
      for (let m = 0; m < 12; m += 1)
        out.push({ start: new Date(y, m, 1).getTime(), label: MES_ABBR[m], anio: y });
  } else {
    let d = START;
    const WEEK = 7 * 24 * 3600 * 1000;
    while (d < END) {
      out.push({ start: d, label: "", anio: new Date(d).getFullYear() });
      d += WEEK;
    }
  }
  return out;
}

function isoWeek(ms: number): number {
  const d = new Date(ms);
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - day + 3);
  const firstThu = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const diff = (date.getTime() - firstThu.getTime()) / 86400000;
  return 1 + Math.round((diff - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
}

// --- Modèle du Gantt (positions en ms absolus) ------------------------------

interface Barra {
  startMs: number;
  solidMs: number; // fin de la barre pleine (début + durée)
  endMs: number; // fin réelle (hachures de solidMs → endMs si > solidMs)
  color: string;
  etiqueta?: string;
  etiquetaCorta?: string; // repli affiché si `etiqueta` ne tient pas dans la barre (sigle)
  etiquetaPequena?: boolean; // texte plus petit (bandes courtes type « CNO »)
  dentro?: boolean;
  etiquetaColor?: string;
  tooltip?: string; // survol (title) — sans texte visible sur la barre
  // --- Remplissage (feuille PAG) : le responsable se lit à la TEXTURE ---
  patron?: string; // background-image de la barre (prime sur `color`)
  borde?: string; // liseré interne, pour que les remplissages clairs se détachent
  // Sigle écrit DANS la barre (s'il y tient) alors que l'étiquette est à côté.
  interior?: string;
  interiorColor?: string;
  // Repère ponctuel (1 jour) : un losange centré sur la date, pas une barre —
  // à l'échelle du mois une barre d'un jour ferait 2 px, illisible.
  rombo?: boolean;
  // Complément gris écrit après l'étiquette extérieure (durée, phase d'application).
  etiquetaMeta?: string;
}
interface Fila {
  label: string;
  bold?: boolean;
  // Ligne de jalon : un petit triangle violet précède le nom dans la colonne.
  hito?: boolean;
  // Repère de phase (modèle enveloppe) : losange de la couleur du rôle devant
  // le nom, et nom en gras — ces lignes structurent la phase.
  marca?: string;
  // Remise du livrable : la SEULE saisie d'avancement du modèle. Cochée = phase
  // livrée. Échue et non cochée = retard, signalé sur la ligne — c'est le signe
  // qu'il faut remettre le cronograma à jour.
  check?: { key: string; marcada: boolean; atrasada: boolean };
  barras: Barra[];
  // Première ligne d'un nouveau groupe de typologie (Aeropuertos / Hospitales /
  // Escuelas) : une bande gris clair est ménagée au-dessus.
  separaGrupo?: boolean;
}
interface Seccion {
  titulo: string;
  barras: Barra[]; // barre de la fase — rendue sur la LIGNE DU TITRE (bande grise)
  filas: Fila[]; // tareas (masquées quand la section est repliée)
}

function barraDe(
  sr: ScheduleResult | undefined,
  color: string,
  etiqueta: string,
  dentro: boolean,
  etiquetaColor?: string,
): Barra | null {
  if (!sr) return null;
  const s = isoMs(sr.start);
  if (s == null) return null;
  const so = isoMs(sr.solidEnd) ?? s;
  const e = isoMs(sr.end) ?? so;
  return { startMs: s, solidMs: so, endMs: e, color, etiqueta, dentro, etiquetaColor };
}

// Assemble le planning d'un sous-projet (mêmes entrées que la feuille de route).
function armar(uid: string, tipologia: string, d: DatosCronograma) {
  const envolvente = esModeloEnvolvente(uid);
  const estado = new Map<string, RoadmapOverride>();
  const planes = new Map<
    string,
    { durValor: number | null; durUnidad: string | null; fechaInicio: string | null; fechaFin: string | null }
  >();
  for (const r of d.roadmapEstado) {
    if (r.feuille !== uid) continue;
    estado.set(r.tareaKey, {
      oculta: r.oculta,
      creada: r.creada,
      componente: (r.componente as ComponenteCode | null) ?? null,
      fila: r.fila,
      orden: r.orden,
      nombre: r.nombre,
    });
    planes.set(r.tareaKey, {
      durValor: r.durValor,
      durUnidad: r.durUnidad,
      fechaInicio: r.fechaInicio,
      fechaFin: r.fechaFin,
    });
  }
  const columnas = construirCartasPorFila({ esGlobal: false, tipologia, uid, estado });
  const tasks: {
    key: string;
    fase: string;
    durValor: number | null;
    durUnidad: Unidad | null;
    fechaInicio: string | null;
    fechaFin: string | null;
  }[] = [];
  for (const [colKey, cards] of columnas) {
    const fila = colKey.split("|")[0];
    for (const c of cards) {
      if (c.nota) continue;
      const p = planes.get(c.key);
      tasks.push({
        key: c.key,
        fase: fila,
        durValor: p?.durValor ?? null,
        durUnidad: asUnidad(p?.durUnidad),
        fechaInicio: p?.fechaInicio ?? null,
        fechaFin: p?.fechaFin ?? null,
      });
    }
  }
  // Repères et jalons (modèle enveloppe) : ce sont des lignes de planning, pas
  // des cartes — `construirCartasPorFila` les écarte, on les ajoute ici. Un
  // jalon `cno` n'a pas de phase : il ne doit allonger aucune enveloppe.
  const hitos = envolvente ? lineasHito(estado) : [];
  for (const h of hitos) {
    const p = planes.get(h.key);
    tasks.push({
      key: h.key,
      fase: h.rol === "cno" ? "" : h.fase,
      durValor: p?.durValor ?? null,
      durUnidad: asUnidad(p?.durUnidad),
      fechaInicio: p?.fechaInicio ?? null,
      fechaFin: p?.fechaFin ?? null,
    });
  }
  // Nœuds de phase : la LISTE vient du référentiel (`GESTION_FASES`), pas de
  // `gestion_lineas`. En modèle enveloppe la phase n'a ni date ni durée propre
  // — elle découle de ses lignes — donc la table n'avait plus rien à apporter
  // ici, et le cronograma ne dépend plus de ce que l'Admin y saisit.
  const faseInicio: Record<string, string | null> = {};
  for (const f of GESTION_FASES) {
    tasks.push({
      key: faseNodeKey(f.code),
      fase: "",
      durValor: null,
      durUnidad: null,
      fechaInicio: null,
      fechaFin: null,
    });
  }
  const links = d.roadmapEnlace
    .filter((e) => e.feuille === uid)
    .map((e) => ({
      desde: e.desde,
      hacia: e.hacia,
      punto: e.punto,
      desfaseValor: e.desfaseValor,
      desfaseUnidad: e.desfaseUnidad,
      extremo: e.extremo,
    }));
  const sched = computeSchedule({
    tasks,
    links,
    faseInicio,
    projectStart: PROJECT_START,
    fasesEnvolventes: envolvente,
  });
  // Avancement : une phase est LIVRÉE quand son repère `Entrega` est coché.
  // C'est la seule saisie d'avancement du modèle — le reste se déduit.
  const realizadas = new Set<string>();
  for (const r of d.roadmapEstado) {
    if (r.feuille === uid && r.realizada) realizadas.add(r.tareaKey);
  }
  return { columnas, sched, hitos, envolvente, realizadas };
}

// Barre d'une fase avec son libellé centré (texte lisible selon le fond).
// `label` : libellé forcé (sinon sigle). La vue « enlace de fases » y met le nom
// complet (ou « CNO » pour les jalons No objeción AFD, courts et en rouge).
function barraFase(
  sr: ScheduleResult | undefined,
  code: string,
  i: number,
  tooltip?: string,
  label?: string,
): Barra | null {
  const color = colorFase(code, i);
  const b = barraDe(sr, color, label ?? FASE_SIGLA[code] ?? "", true, textoSobre(color));
  return b
    ? {
        ...b,
        tooltip,
        etiquetaCorta: FASE_SIGLA[code] ?? "",
        // « CNO » (No objeción AFD) : bandes rouges courtes → texte plus petit.
        etiquetaPequena: code.includes("no_objecion_afd"),
      }
    : null;
}

// Date courte (survol des segments de fase) — ex. « 3 jun 2027 ».
const fmtFecha = (ms: number): string => {
  const d = new Date(ms);
  return `${d.getDate()} ${MES_ABBR[d.getMonth()]} ${d.getFullYear()}`;
};

// Barre d'un repère ou d'un jalon (modèle enveloppe). Les repères de phase
// durent un jour → losange centré sur la date, avec le nom écrit à côté ; les
// « No objeción AFD » durent deux semaines → vraie barre rouge, sigle « CNO »
// dedans s'il y tient (même règle que les autres barres : jamais de troncature).
function barraHito(sr: ScheduleResult | undefined, h: LineaHito): Barra | null {
  if (!sr) return null;
  const color = HITO_COLOR[h.rol];
  const puntual = h.rol !== "cno";
  const b = barraDe(sr, color, h.nombre, false, "#ffffff");
  if (!b) return null;
  return {
    ...b,
    rombo: puntual,
    interior: puntual ? undefined : "CNO",
    interiorColor: "#ffffff",
    tooltip: puntual
      ? `${h.nombre} · ${fmtFecha(b.startMs)}`
      : `${h.nombre} · ${fmtFecha(b.startMs)} → ${fmtFecha(b.endMs)}`,
  };
}

// Enchaînement des fases d'un planning sur UNE ligne (segments colorés). Libellé
// = nom complet de la fase (tronqué si la bande est trop étroite), sauf les
// jalons « No objeción AFD » → « CNO » (bandes rouges courtes). Nom + date au survol.
function barrasFases(sched: Map<string, ScheduleResult>): Barra[] {
  const barras: Barra[] = [];
  FASES_ORD.forEach((f, i) => {
    // Modèle enveloppe : les « No objeción AFD » ne sont plus des fases mais
    // des jalons hors fase — leur nœud de fase est vide (`sinAncla`) et il faut
    // lire le jalon. Sans ça, la frise perdait ses trois bandes rouges et
    // dessinait à la place un segment au repli du moteur (1ᵉʳ janvier 2026).
    const srFase = sched.get(faseNodeKey(f.code));
    const sr = srFase?.sinAncla ? sched.get(HITO_CNO_PREFIX + f.code) : srFase;
    if (!sr || sr.sinAncla) return;
    const label = f.code.includes("no_objecion_afd") ? "CNO" : f.nombre;
    const tooltip = `${f.nombre} · inicio ${fmtFecha(isoMs(sr.start) ?? 0)}`;
    const b = barraFase(sr, f.code, i, tooltip, label);
    if (b) barras.push(b);
  });
  return barras;
}

// Sections d'un sous-projet : UNE section (bande noire) PAR FASE. Dans chaque
// fase : 1re ligne = la barre de la fase elle-même (sa ligne de temps), puis les
// tareas regroupées par composante (GP → EE → AyS → G), les unes sous les autres.
function seccionesSub(
  uid: string,
  tipologia: string,
  d: DatosCronograma,
  filtros: Set<string>,
  hoyMs: number,
  marcadas: Record<string, boolean>,
): Seccion[] {
  const { columnas, sched, hitos, envolvente, realizadas } = armar(uid, tipologia, d);
  // La coche faite dans la session prime sur le snapshot, pas encore rechargé.
  const estaMarcada = (key: string) => marcadas[`${uid}::${key}`] ?? realizadas.has(key);
  const out: Seccion[] = [];

  FASES_ORD.forEach((f, i) => {
    // Barre de la fase : rendue sur la ligne du TITRE (plus de ligne dédiée).
    // Sigle centré ; « No objeción AFD » (et ses jalons) en rouge.
    // En mode enveloppe, une phase sans aucune ligne datée n'a pas de barre du
    // tout (`sinAncla`) — c'est le cas des anciennes phases « No objeción AFD »,
    // devenues des jalons : la section entière disparaît plus bas.
    const srFase = sched.get(faseNodeKey(f.code));
    const bFase = srFase?.sinAncla ? null : barraFase(srFase, f.code, i);

    // Toutes les lignes de la fase — repères, jalons et tareas de toutes les
    // composantes — dans UN SEUL tri CHRONOLOGIQUE. Grouper d'abord par
    // composante cassait la lecture de la chaîne : « Negociación y firma del
    // contrato » (GP) s'affichait avant les jalons AFD dont elle découle.
    const pendientes: {
      label: string;
      barras: Barra[];
      marca?: string;
      check?: Fila["check"];
      _s: number;
      _o: number;
    }[] = [];
    // `_o` départage les lignes de même date, dans l'ordre logique de la phase :
    // on entre par le repère Inicio et on sort par la remise puis les CNO.
    const ORDEN_ROL: Record<string, number> = { inicio: -1, entrega: 1, cno: 2 };
    for (const h of hitos) {
      if (h.fase !== f.code) continue;
      const b = barraHito(sched.get(h.key), h);
      if (b) {
        pendientes.push({
          label: h.nombre,
          marca: HITO_COLOR[h.rol],
          // Seule la REMISE porte la case : c'est elle qui dit « phase livrée ».
          check:
            h.rol === "entrega"
              ? {
                  key: h.key,
                  marcada: estaMarcada(h.key),
                  // Échue et non cochée : le planning ne correspond plus au
                  // réel, il faut le remettre à jour.
                  atrasada: !estaMarcada(h.key) && hoyMs > 0 && b.endMs <= hoyMs,
                }
              : undefined,
          barras: [b],
          _s: b.startMs,
          _o: ORDEN_ROL[h.rol] ?? 0,
        });
      }
    }
    for (const comp of COMPS) {
      if (!filtros.has(comp)) continue;
      for (const c of columnas.get(`${f.code}|${comp}`) ?? []) {
        if (c.nota) continue;
        // Tons CLAIRS de composante (en-tête de carte) pour les détails ;
        // GP en gris moyen (GP_BARRA) plutôt que le noir des cartes.
        const color = comp === "GP" ? GP_BARRA : CARD_TONOS[comp].head;
        const txtColor = comp === "GP" ? textoSobre(GP_BARRA) : CARD_TONOS[comp].headText;
        const b = barraDe(sched.get(c.key), color, c.nombre, false, txtColor);
        pendientes.push({
          label: c.nombre,
          barras: b ? [b] : [],
          _s: b ? b.startMs : Infinity,
          _o: 0,
        });
      }
    }
    pendientes.sort((a, b) => a._s - b._s || a._o - b._o);
    const filas: Fila[] = pendientes.map(({ label, barras, marca, check }) => ({
      label,
      barras,
      marca,
      check,
    }));

    // On masque une fase entièrement vide (pas de barre + aucune tarea visible).
    if (!bFase && filas.length === 0) return;
    out.push({ titulo: f.nombre, barras: bFase ? [bFase] : [], filas });
  });

  // En mode enveloppe, une tâche sans ancre n'est plus rattrapée par sa phase :
  // elle serait posée en 2026 sans le dire. On la remonte en tête, en clair.
  if (envolvente) {
    const sueltas: Fila[] = [];
    for (const [colKey, cards] of columnas) {
      const comp = colKey.split("|")[1] as ComponenteCode;
      if (!filtros.has(comp)) continue;
      for (const c of cards) {
        if (c.nota || !sched.get(c.key)?.sinAncla) continue;
        sueltas.push({ label: c.nombre, barras: [] });
      }
    }
    if (sueltas.length > 0) {
      out.unshift({ titulo: "Sin programar", barras: [], filas: sueltas });
    }
  }

  return out;
}

// Section « Proyecto global » : les éléments de la feuille de route globale,
// positionnés par les RÈGLES de temporalité par semestre (lib/semestres ·
// planTareaGlobal → computeSchedule). MÊME source que les Hojas de ruta : les
// deux vues ne peuvent pas diverger. Les informes semblables sont regroupés sur
// UNE ligne commune (GP ; AyS) ; les autres tâches ont chacune leur ligne. Le
// titre est écrit À CÔTÉ de la barre (comme pour les sous-projets).
// Les cartes de composante GÉNERO sont mises à part : elles ne restent pas dans
// le projet global, elles rejoignent la section « Implementación del PAG ».
function seccionGlobalRoadmap(
  d: DatosCronograma,
  filtros: Set<string>,
): { global: Seccion; genero: Fila[] } {
  const estado = new Map<string, RoadmapOverride>();
  const stored = new Map<string, PlanStored>();
  for (const r of d.roadmapEstado) {
    if (r.feuille !== "global") continue;
    estado.set(r.tareaKey, {
      oculta: r.oculta,
      creada: r.creada,
      componente: (r.componente as ComponenteCode | null) ?? null,
      fila: r.fila,
      orden: r.orden,
      banda: r.banda,
      nombre: r.nombre,
    });
    stored.set(r.tareaKey, {
      fechaInicio: r.fechaInicio,
      durValor: r.durValor,
      durUnidad: r.durUnidad,
      fechaFin: r.fechaFin,
    });
  }
  const columnas = construirCartasPorFila({ esGlobal: true, semestres: SEMESTRES_CODES, estado });

  // Entrées de planning : plan stocké (prime) ou règle → dates via le moteur partagé.
  const tasks: {
    key: string;
    fase: string;
    durValor: number | null;
    durUnidad: Unidad | null;
    fechaInicio: string | null;
    fechaFin: string | null;
  }[] = [];
  const items: { key: string; comp: ComponenteCode; nombre: string }[] = [];
  for (const [colKey, cards] of columnas) {
    const sem = colKey.split("|")[0];
    for (const c of cards) {
      if (c.nota || !filtros.has(c.componente)) continue;
      const p = planGlobalEfectivo(sem, c.key, stored.get(c.key));
      if (p.fechaInicio == null && p.durValor == null) continue;
      tasks.push({
        key: c.key,
        fase: sem,
        durValor: p.durValor,
        durUnidad: p.durUnidad,
        fechaInicio: p.fechaInicio,
        fechaFin: p.fechaFin,
      });
      items.push({ key: c.key, comp: c.componente, nombre: c.nombre });
    }
  }
  const sched = computeSchedule({ tasks, links: [], faseInicio: {}, projectStart: PROJECT_START });

  // Barre d'une carte : couleur de composante + titre écrit à côté (dentro=false).
  const barraCard = (key: string, comp: ComponenteCode, nombre: string): Barra | null => {
    const color = comp === "GP" ? GP_BARRA : CARD_TONOS[comp]?.head ?? "#888888";
    const txt = comp === "GP" ? textoSobre(GP_BARRA) : CARD_TONOS[comp]?.headText ?? "#ffffff";
    const b = barraDe(sched.get(key), color, nombre, false, txt);
    return b ? { ...b, tooltip: `${nombre} · ${fmtFecha(b.startMs)} → ${fmtFecha(b.endMs)}` } : null;
  };

  // Informes regroupés (GP ; AyS) : une ligne commune, une barre par semestre.
  const infGP: Fila & { _s: number } = { label: "Informe semestral / anual", barras: [], _s: Infinity };
  const infAyS: Fila & { _s: number } = { label: "Informe Semestral AyS", barras: [], _s: Infinity };
  const otras: (Fila & { _s: number })[] = [];
  // Cartes Género créées à la main sur la feuille globale : elles partent dans
  // la section « Implementación del PAG », pas dans le projet global.
  const genero: (Fila & { _s: number })[] = [];
  for (const it of items) {
    const b = barraCard(it.key, it.comp, it.nombre);
    if (!b) continue;
    if (it.key.startsWith("informe-gp-")) {
      infGP.barras.push(b);
      infGP._s = Math.min(infGP._s, b.startMs);
    } else if (it.key.startsWith("informe-ays-")) {
      infAyS.barras.push(b);
      infAyS._s = Math.min(infAyS._s, b.startMs);
    } else if (it.comp === "G") {
      genero.push({ label: it.nombre, barras: [b], _s: b.startMs });
    } else {
      otras.push({ label: it.nombre, barras: [b], _s: b.startMs });
    }
  }
  otras.sort((a, b) => a._s - b._s);
  genero.sort((a, b) => a._s - b._s);
  const filas: (Fila & { _s: number })[] = [];
  if (infGP.barras.length > 0) filas.push(infGP);
  if (infAyS.barras.length > 0) filas.push(infAyS);
  filas.push(...otras);

  const desnudar = (f: (Fila & { _s: number })[]) => f.map(({ label, barras }) => ({ label, barras }));

  return {
    global: {
      titulo: "Proyecto global",
      barras: [],
      // Lignes de capacitaciones : libellés en place, planning À DÉFINIR.
      filas: [
        ...desnudar(filas),
        { label: "Capacitaciones Eficiencia Energética", barras: [] },
        { label: "Capacitaciones Género", barras: [] },
      ],
    },
    genero: desnudar(genero),
  };
}

// ============================================================
// Implementación del PAG — les 33 acciones traitées une seule fois (lib/pag).
//
// Le RESPONSABLE se lit au remplissage de la barre (aplat foncé ACEFE, aplat
// clair UG, fond blanc à contour violet AT) et son sigle est écrit dans la barre
// quand il y tient. La colonne de gauche porte le code ET le titre de l'acción,
// tronqué avec le titre complet au survol — comme le reste du cronograma. À
// droite de la barre, seulement la durée et la phase d'application.
// ============================================================

// Plan effectif d'une acción : le catalogue donne le défaut, la DB peut le
// surcharger (dates éditées dans le mode Admin de la feuille).
function tareasPag(d: DatosCronograma): ScheduleTask[] {
  const stored = new Map<string, SnapshotRoadmapEstado>();
  for (const r of d.roadmapEstado) {
    if (r.feuille === FEUILLE_PAG) stored.set(r.tareaKey, r);
  }
  return PAG_ACCIONES.map((a) => {
    const st = stored.get(pagTareaKey(a.code));
    const u = asUnidad(st?.durUnidad);
    // Durée surchargée seulement si valeur ET unité sont présentes.
    const dur = st?.durValor != null && u != null ? { v: st.durValor, u } : { v: a.durValor, u: a.durUnidad };
    return {
      key: a.code,
      fase: "",
      durValor: dur.v,
      durUnidad: dur.u,
      fechaInicio: st?.fechaInicio ?? a.inicio,
      fechaFin: st?.fechaFin ?? a.fin ?? null,
    };
  });
}

const UNIDAD_CORTA: Record<string, string> = { dia: "d", semana: "sem", mes: "meses" };

// Barre d'une acción : remplissage du responsable, puis le titre écrit À CÔTÉ,
// suivi en gris de la durée et de la phase d'application. Le titre est aussi
// dans la colonne de gauche, mais elle est tronquée et reste collée à gauche
// quand on fait défiler l'axe : c'est ici qu'on lit la ligne en entier.
function barraPag(a: PagAccion, sr: ScheduleResult | undefined): Barra | null {
  if (!sr) return null;
  const rel = PAG_RELLENO[a.responsable];
  const b = barraDe(sr, rel.color, a.titulo, false);
  if (!b) return null;
  // Les acciones sans terme le disent en toutes lettres (« 4 sem, luego
  // continuo ») : les hachures seules ne se comprenaient pas.
  const dur = `${a.durValor} ${UNIDAD_CORTA[a.durUnidad] ?? a.durUnidad}${
    a.continua ? `, luego ${a.continuaTxt}` : ""
  }`;
  const meta = [
    dur,
    a.aplicaFase ? `se aplica en ${PAG_FASE_NOMBRE[a.aplicaFase] ?? a.aplicaFase}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    ...b,
    patron: rel.patron,
    borde: rel.borde,
    interior: a.responsable,
    interiorColor: rel.texto,
    etiquetaMeta: meta,
    tooltip: `${a.code} · ${a.titulo} — ${PAG_RESP_NOMBRE[a.responsable]} · ${fmtFecha(b.startMs)} → ${
      a.continua ? a.continuaTxt : fmtFecha(b.endMs)
    }`,
  };
}

// Ligne d'un hito : un repère, avec son NOM écrit à côté (jamais la date — elle
// se lit à la position du repère, comme partout ailleurs dans le cronograma).
// Chaque hito se range sous la ligne dont il est le livrable.
function filaHito(h: PagHito): Fila {
  const ms = isoMs(h.fecha) ?? START;
  return {
    label: h.nombre,
    hito: true,
    barras: [
      {
        startMs: ms,
        solidMs: ms + 6 * 86_400_000,
        endMs: ms + 6 * 86_400_000,
        color: CARD_TONOS.G.foot,
        etiqueta: h.nombre,
        dentro: false,
        tooltip: `${h.nombre} — entregable de ${h.accion} · ${fmtFecha(ms)}`,
      },
    ],
  };
}

// Vue détaillée : une section par cadena de dépendances, plus les hitos.
function seccionesPag(d: DatosCronograma): Seccion[] {
  const sched = computeSchedule({
    tasks: tareasPag(d),
    links: [],
    faseInicio: {},
    projectStart: PROJECT_START,
  });
  // Une section par EJE (et non plus par « cadena ») : le fichier ne définit pas
  // de chaînes, seulement 13 liaisons éparses. Les acciones y sont ordonnées par
  // date, en remontant chaque cible juste après sa source (lib/pag).
  return PAG_EJES.map((eje) => {
    const filas: Fila[] = [];
    for (const a of accionesDeEje(eje.code)) {
      const barra = barraPag(a, sched.get(a.code));
      // Code + titre : tronqué dans la colonne, complet au survol.
      filas.push({ label: `${a.code} · ${a.titulo}`, barras: barra ? [barra] : [] });
      // Le jalon livré par cette acción se range JUSTE EN DESSOUS d'elle.
      for (const h of PAG_HITOS) if (h.accion === a.code) filas.push(filaHito(h));
    }
    return { titulo: `${eje.nombre} · impactos ${eje.impactos}`, barras: [], filas };
  });
}

// Section « Implementación del PAG » de la vue globale : une ligne par eje
// (agrégat de plusieurs responsables → pas de texture, elle n'aurait rien de
// vrai à dire), plus une frise de hitos.
function seccionPagGlobal(d: DatosCronograma, generoFeuilleGlobal: Fila[]): Seccion {
  const sched = computeSchedule({
    tasks: tareasPag(d),
    links: [],
    faseInicio: {},
    projectStart: PROJECT_START,
  });
  const filas: Fila[] = [];
  for (const eje of PAG_EJES) {
    const accs = PAG_ACCIONES.filter((a) => a.eje === eje.code);
    const res = accs.map((a) => sched.get(a.code)).filter((r): r is ScheduleResult => !!r);
    if (res.length === 0) continue;
    const ini = Math.min(...res.map((r) => isoMs(r.start) ?? START));
    const fin = Math.max(...res.map((r) => isoMs(r.end) ?? START));
    filas.push({
      label: eje.nombre,
      barras: [
        {
          startMs: ini,
          solidMs: fin,
          endMs: fin,
          // Violet clair de la composante Género, comme les cartes G du reste
          // du cronograma ; le libellé est écrit DANS la barre, pas à côté, et
          // sans dates — présentation alignée sur le reste de la vue globale.
          color: CARD_TONOS.G.head,
          etiqueta: `${accs.length} acciones · ${eje.nombre}`,
          etiquetaCorta: `${accs.length} acciones`,
          dentro: true,
          etiquetaColor: CARD_TONOS.G.headText,
          tooltip: `${eje.nombre} — impactos ${eje.impactos} · ${fmtFecha(ini)} → ${fmtFecha(fin)}`,
        },
      ],
    });
    // Les jalons de cet eje se rangent JUSTE SOUS sa barre, dans l'ordre.
    for (const h of PAG_HITOS.filter((x) => x.eje === eje.code).sort((a, b) => (a.fecha < b.fecha ? -1 : 1))) {
      filas.push(filaHito(h));
    }
  }
  // Cartes Género saisies à la main sur la feuille globale, avant le catalogue
  // PAG. Conservées ici (elles ne sont pas dans lib/pag) et signalées comme
  // telles — elles font aujourd'hui doublon avec les acciones ci-dessus.
  if (generoFeuilleGlobal.length > 0) {
    filas.push({ label: "— Fichas Género de la hoja global —", barras: [] });
    filas.push(...generoFeuilleGlobal);
  }
  return { titulo: "Implementación del PAG", barras: [], filas };
}

// Vue globale : une ligne par sous-projet, montrant l'ENCHAÎNEMENT des fases
// (chaque fase = un segment coloré avec sa date de démarrage et sa durée).
function seccionGlobal(subs: Snapshot["subproyectos"], d: DatosCronograma): Seccion {
  return {
    titulo: "Subproyectos — enlace de fases",
    barras: [],
    filas: subs.map((s, i) => {
      const { sched } = armar(s.uid, s.tipologia, d);
      return {
        label: s.nombre,
        barras: barrasFases(sched),
        // Les sous-projets arrivent triés par `orden`, donc groupés par typologie :
        // il suffit de comparer avec la ligne précédente pour repérer la rupture.
        separaGrupo: i > 0 && subs[i - 1].tipologia !== s.tipologia,
      };
    }),
  };
}

// ============================================================

export function CronogramaClient() {
  const snap = useSnapshot();
  const rm = useRoadmap();
  const filtros = useComponentFilters();
  const esAdmin = isAdmin(useAuthUser());
  const [gran, setGran] = useState<Gran>("mes");
  const [seleccion, setSeleccion] = useState<Seleccion>("global");
  // « hoy » : client-only (anti-décalage d'hydratation). Sert à la barre rouge
  // ET au repérage des remises échues non cochées (retard).
  const [hoyMs, setHoyMs] = useState<number | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- init client-only (1×) anti-décalage d'hydratation
  useEffect(() => setHoyMs(Date.now()), []);
  // Cases cochées dans la session, avant que le snapshot ne soit rechargé :
  // sans ça la case reviendrait en arrière au clic suivant.
  const [marcadas, setMarcadas] = useState<Record<string, boolean>>({});
  // Fases repliées (titres) — par défaut tout est déplié (détails visibles).
  const [colapsadas, setColapsadas] = useState<Set<string>>(new Set());
  const alternarSeccion = (titulo: string) =>
    setColapsadas((prev) => {
      const next = new Set(prev);
      if (next.has(titulo)) next.delete(titulo);
      else next.add(titulo);
      return next;
    });

  // Mémoïsé : le repli `[]` créerait sinon un tableau neuf à chaque rendu, ce qui
  // invaliderait en permanence les useMemo qui en dépendent.
  const subproyectos = useMemo(
    () => (snap.status === "ready" ? snap.data.subproyectos : []),
    [snap],
  );

  // Options de la liste déroulante « Subproyectos » (groupées par sección ; les
  // écoles y sont classées par numéro d'établissement, cf. HojaSelector).
  const opcionesSel = useMemo<SubOpcion[]>(
    () => subproyectos.map((s) => ({ uid: s.uid, nombre: s.nombre, seccion: s.seccion })),
    [subproyectos],
  );

  // Calcul du planning (parcours de graphe computeSchedule pour chaque sous-projet)
  // mémoïsé : ne se relance que si la donnée, la sélection ou les filtres changent —
  // pas à chaque drag-to-pan / pliage de section / changement de granularité.
  // Nécessite les DEUX sources prêtes (snapshot de base + roadmap).
  const secciones: Seccion[] = useMemo(() => {
    if (snap.status !== "ready" || rm.status !== "ready") return [];
    const datos: DatosCronograma = { ...snap.data, ...rm.data };
    if (seleccion === "global") {
      const { global, genero } = seccionGlobalRoadmap(datos, filtros);
      return [global, seccionPagGlobal(datos, genero), seccionGlobal(datos.subproyectos, datos)];
    }
    if (seleccion === FEUILLE_PAG) return seccionesPag(datos);
    const sub = datos.subproyectos.find((s) => s.uid === seleccion);
    return seccionesSub(seleccion, sub?.tipologia ?? "", datos, filtros, hoyMs ?? 0, marcadas);
  }, [snap, rm, seleccion, filtros, hoyMs, marcadas]);

  const unidades = construirUnidades(gran);
  const totalW = unidades.length * CELL_W;
  const x = (ms: number) => ((ms - START) / SPAN) * totalW;

  // --- Scroll horizontal : vue par défaut calée sur « hoy », zoom ancré, drag-to-pan.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // Date au bord gauche du viewport (ms) — conservée à travers les zooms.
  // null tant que la position initiale (basée sur « hoy ») n'a pas été posée.
  const anclaMsRef = useRef<number | null>(null);
  // Repositionne le scroll pour conserver l'ancre au bord gauche lors d'un zoom.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || anclaMsRef.current == null) return;
    el.scrollLeft = ((anclaMsRef.current - START) / SPAN) * totalW;
  }, [totalW]);
  const onScroll = () => {
    const el = scrollRef.current;
    if (el) anclaMsRef.current = START + (el.scrollLeft / totalW) * SPAN;
  };

  // Drag-to-pan (glisser pour faire défiler horizontalement).
  const dragRef = useRef<{ x: number; left: number } | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const onPointerDown = (e: React.PointerEvent) => {
    // Ne pas détourner les clics sur boutons/liens.
    if ((e.target as HTMLElement).closest("button, a")) return;
    const el = scrollRef.current;
    if (!el) return;
    dragRef.current = { x: e.clientX, left: el.scrollLeft };
    setArrastrando(true);
    el.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const el = scrollRef.current;
    if (!el || !dragRef.current) return;
    el.scrollLeft = dragRef.current.left - (e.clientX - dragRef.current.x);
  };
  const finDrag = (e: React.PointerEvent) => {
    const el = scrollRef.current;
    if (el && dragRef.current) el.releasePointerCapture(e.pointerId);
    dragRef.current = null;
    setArrastrando(false);
  };

  const hoyEnRango = hoyMs != null && hoyMs >= START && hoyMs < END;

  // Cocher la remise d'une phase = déclarer la phase livrée. Mise à jour
  // optimiste : la RLS reste le rempart côté base.
  function marcarEntrega(tareaKey: string, valor: boolean) {
    if (!esAdmin || seleccion === "global" || seleccion === FEUILLE_PAG) return;
    setMarcadas((prev) => ({ ...prev, [`${seleccion}::${tareaKey}`]: valor }));
    roadmapSetRealizada(seleccion, tareaKey, valor).catch(() => {});
  }

  // Position initiale (1×, une fois « hoy » connu) : la barre rouge « hoy » est
  // placée à OFFSET_HOY_CASES cases du bord gauche (colonne des titres), laissant
  // un court passé visible. Si « hoy » est hors fenêtre → repli VISTA_INICIO.
  const posInicialRef = useRef(false);
  useEffect(() => {
    if (posInicialRef.current || hoyMs == null) return;
    const el = scrollRef.current;
    if (!el) return;
    const cellSpan = SPAN / unidades.length; // ms par case (granularité courante)
    const ancla = hoyEnRango ? hoyMs - OFFSET_HOY_CASES * cellSpan : VISTA_INICIO;
    anclaMsRef.current = ancla;
    el.scrollLeft = Math.max(0, ((ancla - START) / SPAN) * totalW);
    posInicialRef.current = true;
  }, [hoyMs, hoyEnRango, unidades.length, totalW]);

  const anios: { anio: number; left: number; width: number }[] = [];
  for (let y = ANIO_INI; y <= ANIO_FIN; y += 1) {
    const l = x(new Date(y, 0, 1).getTime());
    const r = x(new Date(y + 1, 0, 1).getTime());
    anios.push({ anio: y, left: l, width: r - l });
  }

  const segsUnidad = unidades.map((u, i) => {
    const l = x(u.start);
    const r = x(unidades[i + 1]?.start ?? END);
    return { key: u.start, left: l, width: r - l, label: u.label };
  });

  const enSemana = gran === "semana";
  const segsSemana = enSemana
    ? unidades.map((u, i) => ({
        key: u.start,
        left: x(u.start),
        width: x(unidades[i + 1]?.start ?? END) - x(u.start),
        num: isoWeek(u.start),
      }))
    : [];
  const segsMes: { key: number; left: number; width: number; label: string }[] = [];
  if (enSemana) {
    let cur: { y: number; m: number; startMs: number } | null = null;
    for (const u of unidades) {
      const d = new Date(u.start);
      if (!cur || cur.y !== d.getFullYear() || cur.m !== d.getMonth()) {
        if (cur) {
          const l = x(cur.startMs);
          segsMes.push({ key: cur.startMs, left: l, width: x(u.start) - l, label: MES_ABBR[cur.m] });
        }
        cur = { y: d.getFullYear(), m: d.getMonth(), startMs: u.start };
      }
    }
    if (cur) {
      const l = x(cur.startMs);
      segsMes.push({ key: cur.startMs, left: l, width: x(END) - l, label: MES_ABBR[cur.m] });
    }
  }
  const headH = enSemana ? 20 + 18 + 16 : 40;

  const gridStyle = {
    backgroundImage: `repeating-linear-gradient(90deg, transparent 0 ${CELL_W - 1}px, var(--border) ${CELL_W - 1}px ${CELL_W}px)`,
  };

  const esPag = seleccion === FEUILLE_PAG;
  const LW = LABEL_W;

  const activa =
    seleccion === "global"
      ? "Proyecto global"
      : esPag
        ? "Implementación del PAG"
        : subproyectos.find((s) => s.uid === seleccion)?.nombre ?? seleccion;

  // Vue compacte = toutes les fases repliées (seulement les barres de phase).
  const esSub = seleccion !== "global" && !esPag;
  const todasColapsadas = secciones.length > 0 && secciones.every((s) => colapsadas.has(s.titulo));
  const alternarTodas = () =>
    setColapsadas(todasColapsadas ? new Set() : new Set(secciones.map((s) => s.titulo)));

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--text)]">Cronograma</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Fechas calculadas a partir de las duraciones y enlaces (barra llena = duración; rayado =
            hasta la fecha de fin).
          </p>
        </div>
        <div
          className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--app-bg)] p-0.5"
          role="group"
          aria-label="Granularidad"
        >
          {(["semana", "mes", "trimestre"] as Gran[]).map((g) => (
            <button
              key={g}
              type="button"
              aria-pressed={gran === g}
              onClick={() => setGran(g)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors",
                gran === g
                  ? "bg-[var(--surface)] text-[var(--text)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]",
              )}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Sélecteur de feuille : trois boutons, seul « Subproyectos » déroule. */}
      <HojaSelector
        etiqueta="Elegir cronograma"
        subproyectos={opcionesSel}
        valor={seleccion}
        onChange={(uid) => setSeleccion(uid)}
      />

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-[var(--text)]">{activa}</h2>
        {esSub && secciones.length > 0 && (
          <button
            type="button"
            onClick={alternarTodas}
            aria-pressed={todasColapsadas}
            className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
          >
            {todasColapsadas ? "Vista detallada" : "Vista compacta"}
          </button>
        )}
      </div>

      {/* Légende AU-DESSUS du cronograma : remplissages par responsable sur la
          feuille PAG, sigles de fase partout ailleurs. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[var(--text-muted)]">
        {esPag ? (
          <>
            <span className="text-[10px] font-semibold uppercase tracking-wider">Responsable</span>
            {PAG_RESPONSABLES.map((r) => {
              const rel = PAG_RELLENO[r];
              return (
                <span key={r} className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block h-4 w-6 rounded-sm"
                    style={{
                      backgroundColor: rel.color,
                      backgroundImage: rel.patron,
                      boxShadow: rel.borde ? `inset 0 0 0 1px ${rel.borde}` : undefined,
                    }}
                  />
                  <span>{PAG_RESP_NOMBRE[r]}</span>
                </span>
              );
            })}
          </>
        ) : (
        LEYENDA_FASES.map((code) => {
          const color = colorDeFase(code);
          const sigla = FASE_SIGLA[code] ?? "";
          const nombre = GESTION_FASES.find((f) => f.code === code)?.nombre ?? code;
          return (
            <span key={code} className="inline-flex items-center gap-1.5">
              <span
                className="inline-flex h-4 min-w-[22px] items-center justify-center rounded px-1 text-[10px] font-semibold"
                style={{ backgroundColor: color, color: textoSobre(color) }}
              >
                {sigla}
              </span>
              <span>{nombre}</span>
            </span>
          );
        })
        )}
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finDrag}
        onPointerCancel={finDrag}
        className={cn(
          "overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)]",
          arrastrando ? "cursor-grabbing select-none" : "cursor-grab",
        )}
      >
        <div className="relative" style={{ width: LW + totalW }}>
          {hoyEnRango && hoyMs != null && (
            // z sous la colonne d'étiquettes (z-10) : quand on scrolle et que la
            // ligne « hoy » passe derrière les libellés, elle est masquée par eux
            // (au lieu de peindre par-dessus). Reste au-dessus des barres.
            <div
              className="pointer-events-none absolute bottom-0 top-0 z-[5] w-0.5 bg-[var(--accent)]"
              style={{ left: LW + x(hoyMs) }}
              aria-hidden="true"
            />
          )}
          <div className="flex border-b border-[var(--border)]">
            <div className="sticky left-0 z-10 shrink-0 bg-[var(--surface)]" style={{ width: LW }} />
            <div className="relative" style={{ width: totalW, height: headH }}>
              {anios.map((a) => (
                <div
                  key={a.anio}
                  className="absolute top-0 flex items-center justify-center border-l border-[var(--border)] text-xs font-semibold text-[var(--text)]"
                  style={{ left: a.left, width: a.width, height: 20 }}
                >
                  {a.anio}
                </div>
              ))}
              {enSemana ? (
                <>
                  {segsMes.map((m) => (
                    <div
                      key={m.key}
                      className="absolute overflow-hidden truncate border-l border-t border-[var(--border)] px-1 text-[10px] font-medium text-[var(--text-muted)]"
                      style={{ left: m.left, width: m.width, top: 20, height: 18, lineHeight: "18px" }}
                    >
                      {m.width > 16 ? m.label : ""}
                    </div>
                  ))}
                  {segsSemana.map((w) => (
                    <div
                      key={w.key}
                      className="absolute overflow-hidden border-l border-t border-[var(--border)] text-center text-[9px] text-[var(--text-muted)]"
                      style={{ left: w.left, width: w.width, top: 38, height: 16, lineHeight: "16px" }}
                    >
                      {w.width >= 11 ? w.num : ""}
                    </div>
                  ))}
                </>
              ) : (
                segsUnidad.map((u) => (
                  <div
                    key={u.key}
                    className="absolute border-l border-t border-[var(--border)] text-center text-[10px] font-medium text-[var(--text-muted)]"
                    style={{ left: u.left, width: u.width, top: 20, height: 20, lineHeight: "20px" }}
                  >
                    {u.label}
                  </div>
                ))
              )}
            </div>
          </div>

          {secciones.map((sec) => {
            const colapsada = colapsadas.has(sec.titulo);
            const plegable = sec.filas.length > 0;
            return (
              <div key={sec.titulo}>
                {/* Ligne du TITRE : bande grise + barre de la fase + collapse. */}
                <div className="flex border-b border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => plegable && alternarSeccion(sec.titulo)}
                    disabled={!plegable}
                    aria-expanded={plegable ? !colapsada : undefined}
                    className={cn(
                      "sticky left-0 z-10 flex shrink-0 items-center gap-1.5 border-r border-[var(--border)] px-2 text-left text-sm font-semibold text-[var(--text)]",
                      plegable && "cursor-pointer hover:bg-[#e2e5ea]",
                    )}
                    style={{ width: LW, height: ROW_H, backgroundColor: "#eceef2" }}
                    title={sec.titulo}
                  >
                    {plegable && <Chevron abierto={!colapsada} />}
                    <span className="truncate">{sec.titulo}</span>
                  </button>
                  <div
                    className="relative"
                    style={{ width: totalW, height: ROW_H, backgroundColor: "#eceef2" }}
                  >
                    <CapaBarras barras={sec.barras} x={x} />
                  </div>
                </div>
                {!colapsada &&
                  sec.filas.map((fila, fi) => (
                    <div
                      key={fi}
                      className={cn(
                        "flex border-b border-[var(--border)] last:border-b-0",
                        // Rupture de typologie : bande gris très clair (le gris de
                        // fond de l'app), assez discrète pour ne pas faire titre.
                        fila.separaGrupo && "border-t-4 border-t-[var(--app-bg)]",
                      )}
                    >
                      <div
                        className="sticky left-0 z-10 flex shrink-0 items-center border-r border-[var(--border)] bg-[var(--surface)] pl-6 pr-3 text-xs font-semibold text-[var(--text)]"
                        style={{ width: LW, height: ROW_H }}
                        title={fila.label}
                      >
                        {fila.hito && (
                          <span
                            aria-hidden="true"
                            className="mr-2 h-0 w-0 shrink-0 border-y-[4px] border-l-[6px] border-y-transparent"
                            style={{ borderLeftColor: CARD_TONOS.G.foot }}
                          />
                        )}
                        {fila.marca && (
                          <span
                            aria-hidden="true"
                            className="mr-2 h-2 w-2 shrink-0 rotate-45"
                            style={{ backgroundColor: fila.marca }}
                          />
                        )}
                        <span className="truncate">{fila.label}</span>
                        {/* Remise du livrable : la seule saisie d'avancement.
                            Échue et non cochée → « atrasada » en rouge : le
                            cronograma ne colle plus au réel. */}
                        {fila.check && (
                          <span className="ml-auto flex shrink-0 items-center gap-1.5 pl-2">
                            {fila.check.atrasada && (
                              <span
                                className="text-[9px] font-semibold uppercase tracking-wider"
                                style={{ color: UI.accent }}
                              >
                                atrasada
                              </span>
                            )}
                            <input
                              type="checkbox"
                              checked={fila.check.marcada}
                              disabled={!esAdmin}
                              onChange={(e) => marcarEntrega(fila.check!.key, e.target.checked)}
                              className="h-3.5 w-3.5 cursor-pointer accent-[var(--ok)] disabled:cursor-default"
                              title={
                                esAdmin
                                  ? "Marcar la entrega como realizada"
                                  : fila.check.marcada
                                    ? "Entrega realizada"
                                    : "Entrega pendiente"
                              }
                              aria-label={`Entrega realizada — ${fila.label}`}
                            />
                          </span>
                        )}
                      </div>
                      <div className="relative" style={{ width: totalW, height: ROW_H, ...gridStyle }}>
                        <CapaBarras barras={fila.barras} x={x} />
                      </div>
                    </div>
                  ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Chevron de collapse (pivote : bas = ouvert, droite = replié).
function Chevron({ abierto }: { abierto: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="shrink-0 transition-transform"
      style={{ transform: abierto ? "rotate(90deg)" : "none" }}
    >
      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Couche des barres d'une ligne (barre pleine + hachures + étiquette).
function CapaBarras({ barras, x }: { barras: Barra[]; x: (ms: number) => number }) {
  return (
    <>
      {barras.map((b, bi) => {
        const left = x(b.startMs);
        const rPlena = x(b.solidMs);
        const rFin = x(b.endMs);
        // Repère ponctuel : losange centré sur la date, nom écrit à côté.
        if (b.rombo) {
          return (
            <div key={bi}>
              <div
                className="absolute"
                style={{
                  left: left - 5,
                  width: 10,
                  height: 10,
                  top: ROW_H / 2 - 5,
                  backgroundColor: b.color,
                  transform: "rotate(45deg)",
                }}
                title={b.tooltip}
              />
              {b.etiqueta ? (
                <span
                  className="pointer-events-none absolute whitespace-nowrap text-[11px] font-semibold leading-none text-[var(--text)]"
                  style={{ left: left + 9, top: ROW_H / 2 - 5 }}
                >
                  {b.etiqueta}
                </span>
              ) : null}
            </div>
          );
        }
        return (
          <div key={bi}>
            <div
              className="absolute"
              style={{
                left,
                width: Math.max(2, rPlena - left),
                top: 0,
                height: ROW_H,
                backgroundColor: b.color,
                backgroundImage: b.patron,
                boxShadow: b.borde ? `inset 0 0 0 1px ${b.borde}` : undefined,
              }}
              title={b.tooltip}
            >
              {/* Sigle du responsable — écrit seulement s'il tient EN ENTIER
                  (même règle que les sigles de fase : jamais de « ACE… »). */}
              {b.interior && (b.interior.length * 5.7 + 8 <= rPlena - left) ? (
                <span
                  className="pointer-events-none block truncate px-1 text-[10px] font-semibold"
                  style={{ lineHeight: `${ROW_H}px`, color: b.interiorColor ?? "#ffffff" }}
                >
                  {b.interior}
                </span>
              ) : null}
            </div>
            {b.endMs > b.solidMs ? (
              <div
                className="absolute"
                title={b.tooltip}
                style={{
                  left: rPlena,
                  width: rFin - rPlena,
                  top: 0,
                  height: ROW_H,
                  backgroundImage: `repeating-linear-gradient(45deg, ${b.color} 0 5px, #fff 5px 10px)`,
                }}
              />
            ) : null}
            {b.etiqueta && b.dentro ? (
              (() => {
                // Nom complet si la bande est assez large ; sinon les initiales
                // (sigle) ; sinon RIEN (jamais de troncature partielle « Reda… »).
                // S'adapte au zoom (la largeur change). CNO en texte plus petit.
                // Estimation conservatrice (~5,6 px/caractère à 10 px + padding).
                const barW = Math.max(0, rPlena - left);
                const pad = b.etiquetaPequena ? 4 : 8; // px-0.5 (CNO) vs px-1
                const cw = b.etiquetaPequena ? 5.0 : 5.6; // largeur ~ par caractère
                const entra = (t: string) => t.length > 0 && t.length * cw + pad <= barW;
                const corta = b.etiquetaCorta || b.etiqueta;
                const texto = entra(b.etiqueta) ? b.etiqueta : entra(corta) ? corta : "";
                if (!texto) return null;
                return (
                  <span
                    className={cn(
                      "pointer-events-none absolute block truncate font-medium",
                      b.etiquetaPequena ? "px-0.5 text-[9px]" : "px-1 text-[10px]",
                    )}
                    style={{
                      left,
                      width: barW,
                      top: 0,
                      height: ROW_H,
                      lineHeight: `${ROW_H}px`,
                      color: b.etiquetaColor ?? "#1f2733",
                    }}
                    title={b.etiqueta}
                  >
                    {texto}
                  </span>
                );
              })()
            ) : b.etiqueta || b.etiquetaMeta ? (
              <span
                className="pointer-events-none absolute whitespace-nowrap text-[11px] leading-none text-[var(--text)]"
                style={{ left: rFin + 4, top: ROW_H / 2 - 5 }}
              >
                {b.etiqueta}
                {b.etiquetaMeta && (
                  <span className={cn("text-[10px] text-[var(--text-muted)]", b.etiqueta && "ml-2")}>
                    {b.etiquetaMeta}
                  </span>
                )}
              </span>
            ) : null}
          </div>
        );
      })}
    </>
  );
}

