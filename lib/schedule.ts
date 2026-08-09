// ============================================================
// lib/schedule.ts — Moteur de planification des tâches de la feuille de route.
// PUR (aucune dépendance DB/React) : source unique du calcul de dates, partagé
// par les Hojas de ruta ET le Cronograma → les deux vues ne peuvent pas diverger.
//
// Principe (cf. mémoire projet) : on ne stocke que les ENTRÉES (durée estimée,
// date de début/fin fixée à la main, liaisons). Les dates réelles et la position
// des barres sont CALCULÉES à l'affichage, jamais stockées.
//
// Détermination du début d'une tâche (par priorité) :
//   1. date de début fixée à la main → gagne toujours (ancre / décalage réel) ;
//   2. sinon = le PLUS TARDIF parmi (point d'accroche de la source + décalage)
//      sur chaque liaison entrante ;
//   3. sinon = début de la phase (dates saisies dans Gestión), à défaut = début
//      du projet.
// Fin = début + durée estimée (barre PLEINE). Si `fecha_fin` (manuelle) dépasse,
// l'écart est rendu en HACHURES (solidEnd → end). La « fin réelle » d'une source
// (accroche `fin`) inclut cet excédent.
// ============================================================

export type Unidad = "dia" | "semana" | "mes";
export type Punto = "inicio" | "fin";

// Clé d'un nœud de phase (les Fases sont planifiables et enlazables comme les
// cartes). Préfixe réservé, distinct des clés de carte. Ex. « __fase__licitacion ».
export const FASE_NODE_PREFIX = "__fase__";
export const faseNodeKey = (code: string): string => FASE_NODE_PREFIX + code;

// Tâche planifiable (une carte de la feuille de route, hors cartes « nota »).
export interface ScheduleTask {
  key: string;
  fase: string; // code de phase effectif (fila) → ancre par défaut
  durValor: number | null;
  durUnidad: Unidad | null;
  fechaInicio: string | null; // date ISO fixée à la main (ancre) — optionnelle
  fechaFin: string | null; // date ISO fixée à la main (excédent hachuré) — optionnelle
}

// Liaison : « hacia » se cale par rapport à un point de « desde », + décalage signé.
export interface ScheduleLink {
  desde: string; // clé de la tâche source (préalable)
  hacia: string; // clé de la tâche qui en découle
  punto: Punto; // point d'accroche sur la SOURCE (inicio | fin)
  desfaseValor: number; // décalage signé (négatif = avant, positif = après)
  desfaseUnidad: Unidad;
  // Extrémité de la CIBLE qui se cale sur ce point. « inicio » (défaut) = la
  // tâche démarre là ; « fin » = elle TERMINE là, son début recule de sa durée.
  extremo?: Punto;
}

export interface ScheduleInput {
  tasks: ScheduleTask[];
  links: ScheduleLink[];
  faseInicio: Record<string, string | null>; // code de phase → date ISO d'ancre
  projectStart: string; // date ISO de repli (aucune ancre de phase)
  /**
   * Modèle « la fase est l'ENVELOPPE de ses tâches » (cf. maquette validée) :
   * un nœud `__fase__X` n'a plus ni date ni durée propre — il commence avec la
   * première ligne de la phase et finit avec la dernière. Conséquence : une
   * tâche ne peut plus s'ancrer sur sa propre phase (ce serait circulaire) ;
   * elle se cale sur les repères `Inicio` / `Entrega` de la phase, qui sont des
   * lignes comme les autres. Faux = modèle historique (phase planifiée à la
   * main, les tâches s'y accrochent).
   */
  fasesEnvolventes?: boolean;
}

export interface ScheduleResult {
  start: string; // début effectif (ISO)
  solidEnd: string; // fin de la barre pleine = début + durée estimée (ISO)
  end: string; // fin réelle = max(solidEnd, fecha_fin) — bord des hachures + liaisons (ISO)
  startFijada: boolean; // début fixé à la main (≠ calculé par la chaîne)
  finFijada: boolean; // fecha_fin prolonge au-delà de la durée (hachures présentes)
  enCiclo: boolean; // impliquée dans une boucle → une liaison entrante a été ignorée
  // Aucune ancre exploitable (ni date, ni liaison) : les dates ci-dessus sont un
  // repli, pas un planning. Seulement en mode `fasesEnvolventes` — sans ancre de
  // phase à laquelle retomber, la ligne doit se signaler comme non programmée.
  sinAncla?: boolean;
  // Nœud de phase : lignes qui définissent les deux bouts de l'enveloppe.
  primera?: string;
  ultima?: string;
}

const DIA = 86_400_000;

// Parse une date ISO (YYYY-MM-DD) en ms UTC (date-only, insensible au fuseau).
function toMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

// Formate des ms UTC en date ISO (YYYY-MM-DD).
function toIso(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const da = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}

// Ajoute une durée signée à une date (mes = calendaire, avec écrêtage du jour).
export function addUnidad(ms: number, valor: number, unidad: Unidad): number {
  if (unidad === "dia") return ms + valor * DIA;
  if (unidad === "semana") return ms + valor * 7 * DIA;
  // mes : arithmétique calendaire (31 ene + 1 mes → 28/29 feb).
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  const target = m + valor;
  const ny = y + Math.floor(target / 12);
  const nm = ((target % 12) + 12) % 12;
  const nd = Math.min(day, daysInMonth(ny, nm));
  return Date.UTC(ny, nm, nd);
}

/**
 * Calcule le planning de toutes les tâches. Propagation avant (forward pass) sur
 * le graphe des liaisons, mémoïsée, avec détection de boucles : une liaison qui
 * refermerait un cycle est ignorée et la tâche concernée est marquée `enCiclo`.
 */
export function computeSchedule(input: ScheduleInput): Map<string, ScheduleResult> {
  const { tasks, links, faseInicio, projectStart, fasesEnvolventes = false } = input;
  const taskMap = new Map(tasks.map((t) => [t.key, t]));

  // Liaisons entrantes par tâche cible (orphelines ignorées).
  const incoming = new Map<string, ScheduleLink[]>();
  for (const l of links) {
    if (!taskMap.has(l.desde) || !taskMap.has(l.hacia) || l.desde === l.hacia) continue;
    const arr = incoming.get(l.hacia);
    if (arr) arr.push(l);
    else incoming.set(l.hacia, [l]);
  }

  // Mode enveloppe : lignes de chaque phase (les nœuds de phase en sont exclus).
  const porFase = new Map<string, ScheduleTask[]>();
  if (fasesEnvolventes) {
    for (const t of tasks) {
      if (!t.fase || t.key.startsWith(FASE_NODE_PREFIX)) continue;
      const arr = porFase.get(t.fase);
      if (arr) arr.push(t);
      else porFase.set(t.fase, [t]);
    }
  }

  const projMs = toMs(projectStart) ?? Date.UTC(2026, 0, 1);
  const done = new Map<string, ScheduleResult>();
  const visiting = new Set<string>();
  // Lignes qu'une enveloppe a dû sauter parce qu'elles étaient en cours de
  // résolution : elles dépendent (directement ou non) de leur propre phase.
  // L'enveloppe renvoyée est alors PARTIELLE — s'en servir pour dater la ligne
  // fautive donnerait une date fausse et instable.
  const saltadasPorEnvolvente = new Set<string>();

  // Enveloppe d'une phase : du début de sa première ligne à la fin de sa
  // dernière. Une ligne qui ne se résout pas (boucle) est ignorée — l'enveloppe
  // reste alors partielle, ce que `enCiclo` signale.
  const resolveEnvolvente = (key: string): ScheduleResult => {
    const code = key.slice(FASE_NODE_PREFIX.length);
    let iniMs: number | null = null;
    let finMs: number | null = null;
    let primera: string | undefined;
    let ultima: string | undefined;
    let enCiclo = false;
    for (const t of porFase.get(code) ?? []) {
      const r = resolve(t.key);
      if (r == null) {
        enCiclo = true;
        saltadasPorEnvolvente.add(t.key);
        continue;
      }
      const s = toMs(r.start)!;
      const e = toMs(r.end)!;
      if (iniMs == null || s < iniMs) {
        iniMs = s;
        primera = t.key;
      }
      if (finMs == null || e > finMs) {
        finMs = e;
        ultima = t.key;
      }
    }
    const vacia = iniMs == null;
    const s = iniMs ?? projMs;
    const e = finMs ?? s;
    return {
      start: toIso(s),
      solidEnd: toIso(e),
      end: toIso(e),
      startFijada: false,
      finFijada: false,
      enCiclo,
      sinAncla: vacia, // phase sans aucune ligne datée → pas de barre à dessiner
      primera,
      ultima,
    };
  };

  const resolve = (key: string): ScheduleResult | null => {
    const cached = done.get(key);
    if (cached) return cached;
    if (visiting.has(key)) return null; // arête arrière : boucle
    const t = taskMap.get(key);
    if (!t) return null;
    visiting.add(key);

    if (fasesEnvolventes && key.startsWith(FASE_NODE_PREFIX)) {
      const env = resolveEnvolvente(key);
      visiting.delete(key);
      done.set(key, env);
      return env;
    }

    let startMs: number;
    let startFijada = false;
    let enCiclo = false;
    let sinAncla = false;

    const manualInicio = toMs(t.fechaInicio);
    const durValor = t.durValor != null && t.durValor > 0 ? t.durValor : 0;
    const durUnidad = t.durUnidad ?? "dia";

    if (manualInicio != null) {
      startMs = manualInicio;
      startFijada = true;
    } else {
      const candidatos: number[] = [];
      for (const l of incoming.get(key) ?? []) {
        const src = resolve(l.desde);
        if (src == null) {
          enCiclo = true; // liaison en boucle → ignorée
          continue;
        }
        const base = l.punto === "inicio" ? toMs(src.start)! : toMs(src.end)!;
        const objetivo = addUnidad(base, l.desfaseValor, l.desfaseUnidad);
        // « extremo: fin » = c'est la FIN de la cible qui se cale là : son début
        // recule de sa durée estimée.
        candidatos.push(
          l.extremo === "fin" && durValor > 0
            ? addUnidad(objetivo, -durValor, durUnidad)
            : objetivo,
        );
      }
      if (saltadasPorEnvolvente.has(key)) {
        // Une enveloppe traversée en chemin a dû nous sauter : la date qu'elle
        // renvoie ne tient pas compte de nous. Refus de dater plutôt qu'une
        // date fausse (cf. le même garde-fou dans la maquette).
        startMs = projMs;
        enCiclo = true;
        sinAncla = true;
      } else if (candidatos.length > 0) {
        startMs = Math.max(...candidatos);
      } else if (key.startsWith(FASE_NODE_PREFIX)) {
        // Nœud de phase sans date ni liaison → repli projet (pas d'auto-chaînage).
        startMs = projMs;
      } else if (fasesEnvolventes) {
        // Plus d'ancre de phase à laquelle retomber : la phase DÉCOULE de ses
        // lignes. Sans date ni liaison, la ligne n'est pas programmée — on la
        // signale au lieu de la poser silencieusement au début du projet.
        startMs = projMs;
        sinAncla = true;
      } else {
        // Carte : ancre = début CALCULÉ de son nœud de phase (qui peut lui-même
        // découler d'une liaison) ; à défaut, date de phase brute, puis projet.
        const faseNode = taskMap.has(FASE_NODE_PREFIX + t.fase)
          ? resolve(FASE_NODE_PREFIX + t.fase)
          : null;
        startMs = faseNode ? toMs(faseNode.start)! : toMs(faseInicio[t.fase] ?? null) ?? projMs;
      }
    }

    const solidMs = durValor > 0 ? addUnidad(startMs, durValor, durUnidad) : startMs;

    let endMs = solidMs;
    let finFijada = false;
    const manualFin = toMs(t.fechaFin);
    if (manualFin != null && manualFin > solidMs) {
      endMs = manualFin;
      finFijada = true;
    }

    const res: ScheduleResult = {
      start: toIso(startMs),
      solidEnd: toIso(solidMs),
      end: toIso(endMs),
      startFijada,
      finFijada,
      enCiclo,
      sinAncla,
    };
    visiting.delete(key);
    done.set(key, res);
    return res;
  };

  for (const t of tasks) resolve(t.key);
  return done;
}
