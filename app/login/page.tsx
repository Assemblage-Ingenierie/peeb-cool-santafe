"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";
import { LogoSlot } from "@/components/logo-slot";

const INITIAL: LoginState = { error: null };

// Page de connexion (admin / gestión). Rendue sans sidebar ni header
// (AppShell court-circuite la route /login).
export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, INITIAL);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] px-4">
      <div className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
        <div className="mb-6 flex justify-center">
          <LogoSlot
            src="/logos/assemblage.png"
            file="assemblage.png"
            alt="Assemblage ingeniería"
            className="h-12 w-auto"
          />
        </div>

        <h1 className="text-center text-lg font-semibold tracking-tight text-[var(--text)]">
          PEEB Cool — Santa Fe
        </h1>
        <p className="mt-1 text-center text-sm text-[var(--text-muted)]">
          Iniciá sesión para administrar el proyecto.
        </p>

        <form action={formAction} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[var(--text)]">
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[var(--text)]">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
            />
          </div>

          {state.error && (
            <p role="alert" className="text-sm text-[var(--accent)]">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] disabled:opacity-60"
          >
            {pending ? "Ingresando…" : "Ingresar"}
          </button>
        </form>
      </div>
    </main>
  );
}
