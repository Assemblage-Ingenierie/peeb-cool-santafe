"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/password-input";
import { LogoSlot } from "@/components/logo-slot";

const labelCls = "block text-sm font-medium text-[var(--text)]";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== password2) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => {
      router.push("/");
      router.refresh();
    }, 1200);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] px-4">
      <div className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
        <div className="mb-6 flex justify-center">
          <LogoSlot src="/logos/assemblage.png" file="assemblage.png" alt="Assemblage ingeniería" className="h-10 w-auto" />
        </div>
        <h1 className="text-center text-lg font-semibold tracking-tight text-[var(--text)]">
          Nueva contraseña
        </h1>

        {done ? (
          <p className="mt-6 rounded-md bg-green-600/10 px-3 py-2 text-sm text-green-700">
            Contraseña actualizada. Redirigiendo…
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className={labelCls}>Nueva contraseña</label>
              <PasswordInput autoComplete="new-password" required
                value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Confirmar</label>
              <PasswordInput autoComplete="new-password" required
                value={password2} onChange={(e) => setPassword2(e.target.value)} />
            </div>
            {error && (
              <p className="rounded-md bg-[var(--accent)]/10 px-3 py-2 text-sm text-[var(--accent)]">{error}</p>
            )}
            <button type="submit" disabled={loading}
              className="w-full rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60">
              {loading ? "Guardando…" : "Guardar contraseña"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
