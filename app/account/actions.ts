"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import type { RequestedStatus } from "@/lib/auth";

// ============================================================
// Server Actions — self-service du profil (Mi cuenta).
// L'utilisateur édite SA propre ligne peebcoolsf_perfiles. La RLS
// (perfiles_self_update) + la garde anti-escalade autorisent nombre/apellido/
// cargo/requested_status mais figent status/is_approved pour les non-admins.
// ============================================================

export async function updateMyProfile(input: {
  firstName: string;
  lastName: string;
  jobTitle: string;
  requestedStatus: RequestedStatus;
}): Promise<{ error?: string }> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const req: RequestedStatus =
    input.requestedStatus === "gestion" || input.requestedStatus === "admin"
      ? input.requestedStatus
      : null;

  const { error } = await supabase
    .from("peebcoolsf_perfiles")
    .update({
      first_name: input.firstName.trim() || null,
      last_name: input.lastName.trim() || null,
      job_title: input.jobTitle.trim() || null,
      requested_status: req,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return {};
}
