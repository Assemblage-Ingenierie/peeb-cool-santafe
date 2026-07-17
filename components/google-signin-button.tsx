"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";

// ============================================================
// « Continuar con Google » via Google Identity Services (GIS) + signInWithIdToken.
// Le jeton est obtenu SUR NOTRE ORIGINE (pas de redirection vers <ref>.supabase.co),
// donc Google affiche le nom/domaine de l'app, jamais l'URL Supabase.
// Nécessite NEXT_PUBLIC_GOOGLE_CLIENT_ID (client OAuth « Web ») + l'origine courante
// dans « Authorized JavaScript origins » de ce client (Google Cloud Console).
// ============================================================

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const GIS_SRC = "https://accounts.google.com/gsi/client";

type GoogleId = {
  initialize: (cfg: {
    client_id: string;
    nonce: string;
    callback: (r: { credential: string }) => void;
  }) => void;
  renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
};

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleId } };
  }
}

function loadGis(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const existing = document.querySelector(`script[src="${GIS_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", reject);
      return;
    }
    const s = document.createElement("script");
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// Supabase attend : nonce haché envoyé à Google, nonce brut passé à signInWithIdToken.
async function makeNonce() {
  const raw = crypto.randomUUID() + crypto.randomUUID();
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  const hashed = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return { raw, hashed };
}

export function GoogleSignInButton({
  redirectTo = "/",
  onError,
}: {
  redirectTo?: string;
  onError?: (message: string) => void;
}) {
  const router = useRouter();
  const divRef = useRef<HTMLDivElement>(null);
  const rawNonceRef = useRef("");
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) {
      setUnavailable(true);
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        await loadGis();
        const { raw, hashed } = await makeNonce();
        const id = window.google?.accounts?.id;
        if (cancelled || !divRef.current || !id) return;
        rawNonceRef.current = raw;

        id.initialize({
          client_id: CLIENT_ID,
          nonce: hashed,
          callback: async (response) => {
            const supabase = createBrowserSupabase();
            const { error } = await supabase.auth.signInWithIdToken({
              provider: "google",
              token: response.credential,
              nonce: rawNonceRef.current,
            });
            if (error) {
              onError?.(error.message);
              return;
            }
            router.push(redirectTo);
            router.refresh();
          },
        });

        id.renderButton(divRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          logo_alignment: "left",
          width: Math.min(divRef.current.offsetWidth || 320, 400),
        });
      } catch {
        if (!cancelled) {
          setUnavailable(true);
          onError?.("No se pudo cargar el inicio de sesión con Google.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redirectTo]);

  if (unavailable) return null;

  return <div ref={divRef} className="flex min-h-[40px] w-full justify-center" />;
}
