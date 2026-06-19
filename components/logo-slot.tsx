"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

interface LogoSlotProps {
  src: string;
  file: string; // nom de fichier attendu (affiché dans le placeholder si absent)
  alt: string;
  className?: string; // contrôle la taille, ex. "h-9 w-auto"
}

/**
 * Affiche un logo. Si le fichier est absent/illisible, retombe sur un
 * placeholder à bordure pointillée portant le nom du fichier attendu.
 */
export function LogoSlot({ src, file, alt, className }: LogoSlotProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded border border-dashed border-[var(--border)] px-2 font-mono text-[10px] leading-none text-[var(--text-muted)]",
          className,
        )}
        title={`Logo no encontrado: ${file}`}
      >
        {file}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className={cn("object-contain", className)}
    />
  );
}
