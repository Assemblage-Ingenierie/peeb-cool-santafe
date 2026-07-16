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
