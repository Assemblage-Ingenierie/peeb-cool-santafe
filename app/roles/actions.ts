"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth-server";
import { isAdmin, type Rol } from "@/lib/auth";

// ============================================================
// Server Actions — gestion des rôles (admin uniquement).
// La RLS (perfiles_admin) est le rempart réel ; garde applicative en plus.
// ============================================================

const ROLES: Rol[] = ["admin", "gestion", "consultor"];

async function assertAdmin(): Promise<void> {
  if (!isAdmin(await getCurrentUser())) throw new Error("No autorizado");
}

/** Change le statut (rôle) d'un utilisateur et efface sa demande éventuelle. */
export async function adminSetStatus(userId: string, status: Rol): Promise<{ error?: string }> {
  await assertAdmin();
  if (!ROLES.includes(status)) return { error: "Estado inválido" };
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("peebcoolsf_perfiles")
    .update({ status, requested_status: null })
    .eq("id", userId);
  if (error) return { error: error.message };
  revalidatePath("/roles");
  revalidatePath("/", "layout");
  return {};
}

/** Approuve la demande de montée en niveau : status = requested_status. */
export async function adminApproveRequest(userId: string): Promise<{ error?: string }> {
  await assertAdmin();
  const supabase = await createServerSupabase();
  const { data: row } = await supabase
    .from("peebcoolsf_perfiles")
    .select("requested_status")
    .eq("id", userId)
    .maybeSingle();
  const req = row?.requested_status;
  if (req !== "gestion" && req !== "admin") return { error: "Sin solicitud pendiente" };
  const { error } = await supabase
    .from("peebcoolsf_perfiles")
    .update({ status: req, requested_status: null })
    .eq("id", userId);
  if (error) return { error: error.message };
  revalidatePath("/roles");
  revalidatePath("/", "layout");
  return {};
}

/**
 * Valide l'accès d'un nouvel utilisateur (is_approved = true), avec le niveau
 * choisi par l'admin. Tant que is_approved est false, l'utilisateur ne voit que
 * l'écran d'attente et la RLS lui refuse toute donnée métier (migration 029).
 */
export async function adminApproveAccess(userId: string, status: Rol = "consultor"): Promise<{ error?: string }> {
  await assertAdmin();
  if (!ROLES.includes(status)) return { error: "Estado inválido" };
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("peebcoolsf_perfiles")
    // is_rejected = false : le compte ressort de la liste « Accesos rechazados ».
    .update({ is_approved: true, is_rejected: false, status, requested_status: null })
    .eq("id", userId);
  if (error) return { error: error.message };
  revalidatePath("/roles");
  revalidatePath("/", "layout");
  return {};
}

/**
 * Refuse ou révoque l'accès. Le compte auth subsiste : l'utilisateur retombe
 * sur l'écran d'attente à sa prochaine visite. `is_rejected` le range dans la
 * liste « Accesos rechazados » pour qu'il ne pollue plus le tableau principal.
 */
export async function adminRevokeAccess(userId: string): Promise<{ error?: string }> {
  await assertAdmin();
  // Garde anti-lockout : un admin ne peut pas se retirer son propre accès.
  const actual = await getCurrentUser();
  if (actual?.id === userId) return { error: "No podés revocar tu propio acceso" };
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("peebcoolsf_perfiles")
    .update({ is_approved: false, is_rejected: true, requested_status: null })
    .eq("id", userId);
  if (error) return { error: error.message };
  revalidatePath("/roles");
  revalidatePath("/", "layout");
  return {};
}

/** Rejette la demande (efface requested_status sans changer le statut). */
export async function adminRejectRequest(userId: string): Promise<{ error?: string }> {
  await assertAdmin();
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("peebcoolsf_perfiles")
    .update({ requested_status: null })
    .eq("id", userId);
  if (error) return { error: error.message };
  revalidatePath("/roles");
  return {};
}
