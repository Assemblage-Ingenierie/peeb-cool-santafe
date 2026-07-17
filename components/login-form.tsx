"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { GoogleSignInButton } from "@/components/google-signin-button";
import { LogoSlot } from "@/components/logo-slot";

type Mode = "home" | "login" | "signup" | "forgot";
type Msg = { type: "success" | "error"; text: string } | null;

const APP_TAG = "peeb-santafe"; // métadonnée pour l'email conditionnel (Confirm sign-up)

const inputCls =
  "mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--focus)]";
const labelCls = "block text-sm font-medium text-[var(--text)]";
const primaryCls =
  "w-full rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60";
const secondaryCls =
  "w-full rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--app-bg)]";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/";

  const [mode, setMode] = useState<Mode>("home");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [jobTitle, setJobTitle] = useState("");

  function go(next: Mode) {
    setMsg(null);
    setPassword("");
    setPassword2("");
    setLoading(false);
    setMode(next);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setMsg({ type: "error", text: "Correo o contraseña incorrectos (o correo no confirmado)." });
      return;
    }
    router.push(redirect);
    router.refresh();
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setMsg({ type: "error", text: "La contraseña debe tener al menos 6 caracteres." });
      return;
    }
    if (password !== password2) {
      setMsg({ type: "error", text: "Las contraseñas no coinciden." });
      return;
    }
    setLoading(true);
    setMsg(null);
    const supabase = createBrowserSupabase();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { app: APP_TAG, first_name: firstName, last_name: lastName, job_title: jobTitle },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) {
      setMsg({ type: "error", text: error.message });
      return;
    }
    if (data.session) {
      // Confirmation d'email désactivée → session immédiate.
      router.push(redirect);
      router.refresh();
      return;
    }
    setMsg({
      type: "success",
      text: "¡Cuenta creada! Revisá tu correo para confirmar tu dirección, luego iniciá sesión.",
    });
    setMode("login");
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setLoading(false);
    setMsg(
      error
        ? { type: "error", text: error.message }
        : {
            type: "success",
            text: "Si existe una cuenta para esta dirección, te enviamos un enlace de recuperación.",
          },
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] px-4">
      <div className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
        <div className="mb-6 flex justify-center">
          <LogoSlot
            src="/logos/assemblage.png"
            file="assemblage.png"
            alt="Assemblage ingeniería"
            className="h-10 w-auto"
          />
        </div>
        <h1 className="text-center text-lg font-semibold tracking-tight text-[var(--text)]">
          PEEB Cool — Santa Fe
        </h1>
        <p className="mt-1 text-center text-sm text-[var(--text-muted)]">
          {mode === "home" && "Plataforma de seguimiento del proyecto"}
          {mode === "login" && "Iniciar sesión"}
          {mode === "signup" && "Crear una cuenta"}
          {mode === "forgot" && "Recuperar contraseña"}
        </p>

        {/* HOME */}
        {mode === "home" && (
          <div className="mt-6 space-y-3">
            <button type="button" className={primaryCls} onClick={() => go("signup")}>
              Crear una cuenta
            </button>
            <button type="button" className={secondaryCls} onClick={() => go("login")}>
              Iniciar sesión
            </button>
            <div className="my-2 flex items-center gap-3">
              <span className="h-px flex-1 bg-[var(--border)]" />
              <span className="text-xs text-[var(--text-muted)]">o</span>
              <span className="h-px flex-1 bg-[var(--border)]" />
            </div>
            <GoogleSignInButton redirectTo={redirect} onError={(t) => setMsg({ type: "error", text: t })} />
          </div>
        )}

        {/* LOGIN */}
        {mode === "login" && (
          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className={labelCls} htmlFor="email">Correo electrónico</label>
              <input id="email" type="email" autoComplete="email" required className={inputCls}
                value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className={labelCls} htmlFor="password">Contraseña</label>
              <input id="password" type="password" autoComplete="current-password" required className={inputCls}
                value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button type="submit" disabled={loading} className={primaryCls}>
              {loading ? "Ingresando…" : "Ingresar"}
            </button>
            <button type="button" onClick={() => go("forgot")}
              className="block w-full text-center text-xs font-medium text-[var(--accent)] underline">
              Olvidé mi contraseña
            </button>
            <div className="my-1 flex items-center gap-3">
              <span className="h-px flex-1 bg-[var(--border)]" />
              <span className="text-xs text-[var(--text-muted)]">o</span>
              <span className="h-px flex-1 bg-[var(--border)]" />
            </div>
            <GoogleSignInButton redirectTo={redirect} onError={(t) => setMsg({ type: "error", text: t })} />
          </form>
        )}

        {/* SIGNUP */}
        {mode === "signup" && (
          <form onSubmit={handleSignup} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Nombre</label>
                <input required className={inputCls} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Apellido</label>
                <input required className={inputCls} value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Cargo <span className="font-normal text-[var(--text-muted)]">(opcional)</span></label>
              <input className={inputCls} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Ej. Ingeniero/a" />
            </div>
            <div>
              <label className={labelCls}>Correo electrónico</label>
              <input type="email" autoComplete="email" required className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Contraseña</label>
                <input type="password" autoComplete="new-password" required className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Confirmar</label>
                <input type="password" autoComplete="new-password" required className={inputCls} value={password2} onChange={(e) => setPassword2(e.target.value)} />
              </div>
            </div>
            <button type="submit" disabled={loading} className={primaryCls}>
              {loading ? "Creando…" : "Crear cuenta"}
            </button>
          </form>
        )}

        {/* FORGOT */}
        {mode === "forgot" && (
          <form onSubmit={handleForgot} className="mt-6 space-y-4">
            <p className="text-sm text-[var(--text-muted)]">
              Ingresá tu correo para recibir un enlace de recuperación.
            </p>
            <div>
              <label className={labelCls}>Correo electrónico</label>
              <input type="email" autoComplete="email" required className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <button type="submit" disabled={loading} className={primaryCls}>
              {loading ? "Enviando…" : "Enviar enlace de recuperación"}
            </button>
          </form>
        )}

        {msg && (
          <p
            className={
              "mt-4 rounded-md px-3 py-2 text-sm " +
              (msg.type === "success"
                ? "bg-green-600/10 text-green-700"
                : "bg-[var(--accent)]/10 text-[var(--accent)]")
            }
          >
            {msg.text}
          </p>
        )}

        {mode !== "home" && (
          <button type="button" onClick={() => go("home")}
            className="mx-auto mt-5 block text-xs text-[var(--text-muted)] hover:text-[var(--text)]">
            ← Volver
          </button>
        )}
      </div>
    </div>
  );
}
