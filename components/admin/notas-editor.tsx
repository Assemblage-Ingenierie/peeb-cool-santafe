"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

// ============================================================
// Éditeur « Notas » minimal : texte libre, gras + rouge Assemblage.
// contentEditable + execCommand (aucune dépendance). Le contenu est ASSAINI
// (liste blanche : <strong>, <span style="color:#E30513">, <br>) à la saisie
// ET à l'affichage → pas de HTML arbitraire stocké/rendu (anti-XSS).
// Le rouge = accent Assemblage ; le noir = couleur de texte par défaut.
// ============================================================

const RED = "#E30513"; // --accent (Assemblage)
const BLACK = "#272a33"; // --text

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function isRed(el: HTMLElement): boolean {
  const c = (el.style.color || el.getAttribute("color") || "").replace(/\s+/g, "").toLowerCase();
  return c === "rgb(227,5,19)" || c === "rgba(227,5,19,1)" || c === "#e30513";
}
function hasExplicitColor(el: HTMLElement): boolean {
  return Boolean(el.style.color || el.getAttribute("color"));
}

function wrapRun(text: string, bold: boolean, red: boolean): string {
  let s = escapeHtml(text);
  if (!s) return "";
  if (red) s = `<span style="color:${RED}">${s}</span>`;
  if (bold) s = `<strong>${s}</strong>`;
  return s;
}

/**
 * Aplati l'arbre HTML en « runs » normalisés (gras hérité + rouge hérité),
 * en ne conservant QUE le texte, <strong>, <span style="color:#E30513"> et <br>.
 * Tout le reste est retiré (texte préservé).
 */
export function sanitizeNotas(html: string): string {
  if (!html) return "";
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  const parts: string[] = [];

  const walk = (node: Node, bold: boolean, red: boolean) => {
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        parts.push(wrapRun(child.textContent || "", bold, red));
        return;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) return;
      const el = child as HTMLElement;
      const tag = el.tagName.toLowerCase();
      if (tag === "br") {
        parts.push("<br>");
        return;
      }
      const style = el.getAttribute("style") || "";
      const nextBold =
        bold || tag === "b" || tag === "strong" || /font-weight:\s*(bold|[6-9]00)/i.test(style);
      const nextRed = isRed(el) ? true : hasExplicitColor(el) ? false : red;
      const isBlock = tag === "div" || tag === "p";
      if (isBlock && parts.length && parts[parts.length - 1] !== "<br>") parts.push("<br>");
      walk(el, nextBold, nextRed);
    });
  };

  walk(tmp, false, false);
  return parts.join("").replace(/(<br>)+$/g, "").trim();
}

export function NotasEditor({ value, onCommit }: { value: string; onCommit: (html: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  // Synchronise le contenu depuis l'extérieur (montage, changement de sous-projet),
  // mais JAMAIS pendant la saisie (sinon le curseur saute). DOM-sync, pas du state.
  useEffect(() => {
    const el = ref.current;
    if (!el || document.activeElement === el) return;
    const clean = sanitizeNotas(value || "");
    if (el.innerHTML !== clean) el.innerHTML = clean;
  }, [value]);

  // Applique une commande de formatage sans perdre la sélection de l'éditeur.
  const apply = (e: React.MouseEvent, fn: () => void) => {
    e.preventDefault(); // garde le focus/sélection sur le contentEditable
    ref.current?.focus();
    fn();
  };

  const setColor = (color: string) => {
    document.execCommand("styleWithCSS", false, "true"); // force <span style> (≠ <font>)
    document.execCommand("foreColor", false, color);
  };

  const commit = () => {
    const el = ref.current;
    if (!el) return;
    const clean = sanitizeNotas(el.innerHTML);
    if (clean !== el.innerHTML) el.innerHTML = clean; // normalise l'affichage
    if (clean !== (value || "")) onCommit(clean);
  };

  const btn =
    "inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded px-1.5 text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--text)]";

  return (
    <div className="w-full rounded-md border border-[var(--border)] bg-[var(--app-bg)]">
      <div className="flex items-center gap-0.5 border-b border-[var(--border)] px-1 py-1">
        <button type="button" title="Negrita" aria-label="Negrita" className={cn(btn, "font-bold")} onMouseDown={(e) => apply(e, () => document.execCommand("bold"))}>
          N
        </button>
        <span className="mx-0.5 h-4 w-px bg-[var(--border)]" aria-hidden="true" />
        <button type="button" title="Texto negro" aria-label="Texto negro" className={btn} onMouseDown={(e) => apply(e, () => setColor(BLACK))}>
          <span style={{ color: BLACK }} className="font-semibold">A</span>
        </button>
        <button type="button" title="Texto rojo" aria-label="Texto rojo" className={btn} onMouseDown={(e) => apply(e, () => setColor(RED))}>
          <span style={{ color: RED }} className="font-semibold">A</span>
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Notas"
        onBlur={commit}
        className="min-h-[4.5rem] w-full px-3 py-2 text-sm text-[var(--text)] outline-none focus:bg-[var(--surface)]"
      />
    </div>
  );
}
