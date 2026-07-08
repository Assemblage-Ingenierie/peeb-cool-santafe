"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth-server";
import { TABLES } from "@/lib/admin/config";
import type { EventoInput } from "@/components/calendario/tipos";

// ============================================================
// app/calendario/actions.ts — écriture des événements depuis le Calendario.
//
// CONTRAIREMENT à app/admin/actions.ts (réservé admin), ces actions sont
// destinées à TOUS les utilisateurs CONNECTÉS (CDC §4.3, décision user :
// non-admins peuvent gérer les réunions), quel que soit le rôle.
//
// Créations et suppressions sont journalisées dans peebcoolsf_eventos_actividad
// → alimente l'alerte « +N » de l'Inicio (prévenir l'admin, y c. des suppressions).
// ============================================================

async function assertPuedeGestionarEventos(): Promise<void> {
  // getCurrentUser gère déjà le bypass dev (→ mock admin).
  if (!(await getCurrentUser())) throw new Error("No autorizado");
}

const COMPONENTES_OK = new Set(["GP", "EE", "AyS", "G"]);
const MODALIDADES_OK = new Set(["Presencial", "Virtual"]);

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function trimOrNull(v: unknown): string | null {
  const t = asString(v).trim();
  return t === "" ? null : t;
}
function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function validarFecha(v: unknown): string {
  const t = asString(v).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) throw new Error("Fecha inválida");
  const [, m, d] = t.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) throw new Error("Fecha inválida");
  return t;
}
function validarHora(v: unknown): string | null {
  const t = asString(v).trim();
  if (t === "") return null;
  if (!/^\d{2}:\d{2}$/.test(t)) throw new Error("Hora inválida");
  return t;
}
function validarEnum(v: unknown, ok: Set<string>, label: string): string | null {
  const t = trimOrNull(v);
  if (t && !ok.has(t)) throw new Error(`${label} inválido`);
  return t;
}

/** Construit les colonnes scalaires d'un evento à partir de l'entrée (validées). */
function normalizar(input: EventoInput) {
  const nombre = asString(input.nombre).trim();
  if (nombre === "") throw new Error("El nombre es obligatorio");
  return {
    nombre,
    fecha: validarFecha(input.fecha),
    hora_inicio: validarHora(input.hora_inicio),
    hora_fin: validarHora(input.hora_fin),
    componente: validarEnum(input.componente, COMPONENTES_OK, "Componente"),
    modalidad: validarEnum(input.modalidad, MODALIDADES_OK, "Modalidad"),
    lugar: trimOrNull(input.lugar),
    url_conexion: trimOrNull(input.url_conexion),
    url_documento: trimOrNull(input.url_documento),
    formacion: !!input.formacion,
  };
}

/** Ne conserve que les UID de participants réellement présents (equipo | entidades). */
async function limpiarParticipantes(sb: SupabaseClient, raw: unknown): Promise<string[]> {
  const arr = Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [];
  if (arr.length === 0) return [];
  const uniq = [...new Set(arr)];
  const [eq, ent] = await Promise.all([
    sb.from("peebcoolsf_equipo").select("uid").in("uid", uniq),
    sb.from("peebcoolsf_entidades").select("uid").in("uid", uniq),
  ]);
  if (eq.error) throw new Error(eq.error.message);
  if (ent.error) throw new Error(ent.error.message);
  const validos = new Set(
    [...(eq.data ?? []), ...(ent.data ?? [])].map((r) => (r as { uid: string }).uid),
  );
  return uniq.filter((u) => validos.has(u));
}

/** Journalise une action (best-effort : ne fait jamais échouer l'opération utilisateur). */
async function registrarActividad(
  sb: SupabaseClient,
  tipo: "creado" | "eliminado",
  eventoUid: string,
  nombre: string,
  fecha: string | null,
): Promise<void> {
  try {
    await sb.from("peebcoolsf_eventos_actividad").insert({
      tipo,
      evento_uid: eventoUid,
      evento_nombre: nombre,
      evento_fecha: fecha,
    });
  } catch {
    // Notification best-effort : une erreur de journal ne doit pas bloquer l'action.
  }
}

/** Crée un événement (UID EVT-NNNN généré serveur) + journalise « creado ». */
export async function crearEvento(input: EventoInput): Promise<{ uid: string }> {
  await assertPuedeGestionarEventos();
  const sb = createServiceClient();
  const base = normalizar(input);
  const participantes = await limpiarParticipantes(sb, input.participantes);

  const cfg = TABLES.eventos;
  const { data: existing, error: readErr } = await sb.from(cfg.table).select("uid");
  if (readErr) throw new Error(readErr.message);
  const re = new RegExp(`^${escapeRe(cfg.uidPrefix)}(\\d+)$`);
  const max = ((existing ?? []) as { uid: string }[]).reduce((acc, r) => {
    const m = re.exec(String(r.uid));
    return m ? Math.max(acc, Number(m[1])) : acc;
  }, 0);
  const uid = cfg.uidPrefix + String(max + 1).padStart(cfg.uidPad, "0");

  const { error: insErr } = await sb.from(cfg.table).insert({ uid, ...base, participantes });
  if (insErr) throw new Error(insErr.message);

  await registrarActividad(sb, "creado", uid, base.nombre, base.fecha);
  return { uid };
}

/** Met à jour un événement existant (pas de journalisation : édition non notifiée). */
export async function actualizarEvento(uid: string, input: EventoInput): Promise<void> {
  await assertPuedeGestionarEventos();
  if (!/^EVT-\d+$/.test(uid)) throw new Error("UID inválido");
  const sb = createServiceClient();
  const base = normalizar(input);
  const participantes = await limpiarParticipantes(sb, input.participantes);

  const { error } = await sb
    .from(TABLES.eventos.table)
    .update({ ...base, participantes })
    .eq("uid", uid);
  if (error) throw new Error(error.message);
}

/** Supprime un événement. Journalise « eliminado » AVANT (pour conserver nom + fecha). */
export async function eliminarEvento(uid: string): Promise<void> {
  await assertPuedeGestionarEventos();
  if (!/^EVT-\d+$/.test(uid)) throw new Error("UID inválido");
  const sb = createServiceClient();

  const { data: ev, error: readErr } = await sb
    .from(TABLES.eventos.table)
    .select("uid, nombre, fecha")
    .eq("uid", uid)
    .maybeSingle();
  if (readErr) throw new Error(readErr.message);
  if (!ev) throw new Error("Evento inexistente");

  const row = ev as { nombre: string | null; fecha: string | null };
  await registrarActividad(sb, "eliminado", uid, row.nombre ?? "", row.fecha ?? null);

  const { error } = await sb.from(TABLES.eventos.table).delete().eq("uid", uid);
  if (error) throw new Error(error.message);
}
