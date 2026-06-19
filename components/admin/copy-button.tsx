"use client";

import { useState } from "react";
import { ClipboardIcon, CheckIcon } from "@/components/icons";

interface CopyButtonProps {
  value: string;
  label?: string;
}

/** Bouton de copie (ex. UID) avec retour visuel bref. */
export function CopyButton({ value, label }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch {
          // presse-papier indisponible (contexte non sécurisé) — silencieux
        }
      }}
      title={label ?? `Copiar ${value}`}
      aria-label={label ?? `Copiar ${value}`}
      className="inline-flex h-6 w-6 items-center justify-center rounded text-[var(--text-muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--text)]"
    >
      {copied ? (
        <CheckIcon className="h-3.5 w-3.5 text-[var(--accent)]" />
      ) : (
        <ClipboardIcon className="h-3.5 w-3.5" />
      )}
    </button>
  );
}
