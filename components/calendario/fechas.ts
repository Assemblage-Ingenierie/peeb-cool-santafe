// ============================================================
// components/calendario/fechas.ts — Helpers de dates pour le Calendario.
//
// Règle anti-fuseau : les `fecha` de la base sont des chaînes « AAAA-MM-DD »
// (jour « civil » argentin). On ne fait JAMAIS `new Date("AAAA-MM-DD")` (parse
// UTC → décalage en Argentine UTC−3). On découpe la chaîne, et on construit les
// jours de la grille en LOCAL via `new Date(y, m, d)` (indépendant du fuseau :
// construction + lecture locales sont cohérentes).
//
// Les horaires sont SAISIS en heure d'Argentine (lieu du projet). Le Calendario
// peut les afficher tels quels (AR) ou convertis en heure de France (FR, heure
// d'été gérée automatiquement par `Intl`).
// ============================================================

// Zone d'affichage des horaires.
export type Zona = "AR" | "FR";

const ZONA_TZ: Record<Zona, string> = {
  AR: "America/Argentina/Buenos_Aires", // UTC−3 fixe (pas d'heure d'été)
  FR: "Europe/Paris", // UTC+1 / UTC+2 (heure d'été)
};

// Argentine = UTC−3 toute l'année (pas d'heure d'été) → un horaire mural argentin
// correspond à l'instant UTC « +3h ». Constante explicite, vérifiée et stable.
const AR_OFFSET_H = 3;

/** Découpe « AAAA-MM-DD » en [année, mois (1-12), jour], sans Date. */
export function parseFecha(fecha: string): [number, number, number] {
  const [y, m, d] = fecha.split("-").map(Number);
  return [y, m, d];
}

/** Clé « AAAA-MM-DD » d'une Date lue en local (jamais en UTC). */
export function ymd(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

/** Date du jour (locale), au format « AAAA-MM-DD ». */
export function hoyStr(): string {
  return ymd(new Date());
}

/**
 * Heure affichée « HH:MM » selon la zone.
 * `hora` = « HH:MM:SS » (heure d'Argentine, telle qu'en base) ou null.
 * - AR : on renvoie l'horaire brut (déjà en heure d'Argentine).
 * - FR : on calcule l'instant UTC (= AR + 3h) puis on formate en Europe/Paris
 *   (l'heure d'été française est gérée par `Intl`).
 */
export function horaEnZona(fecha: string, hora: string | null, zona: Zona): string | null {
  if (!hora) return null;
  const hhmm = hora.slice(0, 5);
  if (zona === "AR") return hhmm;

  const [y, m, d] = parseFecha(fecha);
  const [H, M] = hhmm.split(":").map(Number);
  const instante = new Date(Date.UTC(y, m - 1, d, H + AR_OFFSET_H, M, 0));
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: ZONA_TZ.FR,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(instante);
}

/**
 * Libellé d'offset pour le sélecteur (ex. « GMT−3 », « GMT+2 »), calculé pour le
 * mois affiché afin de refléter l'heure d'été française. Le « − » est typographique.
 */
export function offsetLabel(zona: Zona, year: number, monthIdx: number): string {
  const muestra = new Date(Date.UTC(year, monthIdx, 15, 12, 0, 0));
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONA_TZ[zona],
    timeZoneName: "shortOffset",
  }).formatToParts(muestra);
  const tz = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  return tz.replace("-", "−");
}

/**
 * Jours à afficher pour le mois (monthIdx 0-based), semaine lundi→dimanche,
 * nombre de semaines dynamique (4 à 6) pour éviter une rangée vide. Les jours
 * des mois adjacents sont inclus (Date normalise les jours hors plage).
 */
export function diasDelMes(year: number, monthIdx: number): Date[] {
  const premier = new Date(year, monthIdx, 1);
  // getDay : 0=dim … 6=sam → offset pour démarrer la grille un lundi.
  const offset = (premier.getDay() + 6) % 7;
  const nbJours = new Date(year, monthIdx + 1, 0).getDate();
  const total = Math.ceil((offset + nbJours) / 7) * 7;
  const dias: Date[] = [];
  for (let i = 0; i < total; i++) {
    dias.push(new Date(year, monthIdx, 1 - offset + i));
  }
  return dias;
}

// Libellés espagnols (Argentine). Ne sont pas des libellés de marque → restent
// locaux au Calendario (lib/constants.ts est réservé aux couleurs/libellés métier).
export const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// En-têtes de colonnes (lundi → dimanche).
export const DIAS_SEMANA = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];
