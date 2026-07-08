"use server";

import { redirect } from "next/navigation";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { SUPABASE_AUTH_CONFIGURED } from "@/lib/supabase/config";

// ============================================================
// Server Actions d'authentification (connexion / déconnexion).
// La connexion pose les cookies de session via le client lié aux cookies.
// ============================================================

export type LoginState = { error: string | null };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!SUPABASE_AUTH_CONFIGURED) {
    return { error: "La autenticación no está configurada." };
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { error: "Ingresá tu correo y tu contraseña." };
  }

  const supabase = await createAuthServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: "Correo o contraseña incorrectos." };
  }

  // redirect() lève une exception interne gérée par Next → hors de tout try/catch.
  redirect("/");
}

export async function logout() {
  const supabase = await createAuthServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
