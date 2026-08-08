"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { TIPOLOGIAS } from "@/lib/constants";

// Couleur de charte par section. Les sections de la liste portent le même
// libellé que les typologies (Aeropuertos / Hospitales / Escuelas) — on réutilise
// donc leur couleur plutôt que d'en inventer une (lib/constants = source unique).
const COLOR_SECCION: Record<string, string> = Object.fromEntries(
  TIPOLOGIAS.map((t) => [t.nombre, t.color]),
);

// ============================================================
// Sélecteurs de sous-projet — deux présentations, une même liste de recherche.
//
//   • HojaSelector      : Cronograma et Hojas de ruta. Trois boutons
//     rectangulaires (Proyecto global / Implementación del PAG / Subproyectos) ;
//     seul le troisième ouvre la liste déroulante.
//   • SubproyectoSelect : Admin. Un seul bouton qui ouvre la même liste.
//
// Motif commun : avec 27 sous-projets aux noms officiels longs, une barre de
// pastilles occupait une dizaine de lignes. Ici l'encombrement est constant.
// ============================================================

export interface SubOpcion {
  uid: string; // valeur retournée ("global" ou un uid SUB-…)
  nombre: string;
  seccion: string; // en-tête de groupe (Aeropuertos / Hospitales / Escuelas / …)
  color?: string; // pastille de typologie, si la surface en affiche une
}

/** Clé de feuille du plan d'action genre. Feuille à définir — bouton inactif. */
export const FEUILLE_PAG = "pag";

// Numéro d'établissement extrait du nom (« EPCD N°749 "…" » → 749). Sert à
// classer les écoles par numéro plutôt que par ordre d'insertion. Le premier
// numéro l'emporte quand le nom en cite deux (« EESO N°331 y EPCD N°1250 »).
function numeroEstablecimiento(nombre: string): number | null {
  const m = /N[°º]\s*(\d+)/.exec(nombre);
  return m ? Number(m[1]) : null;
}

/** Tri d'un groupe : par numéro d'établissement croissant ; sans numéro, ordre reçu. */
function ordenarPorNumero(items: SubOpcion[]): SubOpcion[] {
  return items
    .map((o, i) => ({ o, i, n: numeroEstablecimiento(o.nombre) }))
    .sort((a, b) => {
      if (a.n == null && b.n == null) return a.i - b.i;
      if (a.n == null) return 1; // sans numéro : à la fin
      if (b.n == null) return -1;
      return a.n - b.n;
    })
    .map((x) => x.o);
}

// Recherche insensible à la casse et aux accents (« martin » trouve « Martín »),
// SANS toucher aux chiffres : on doit pouvoir chercher « 6093 ».
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

// ------------------------------------------------------------
// Panneau commun : champ de recherche + liste groupée, navigable au clavier.
// ------------------------------------------------------------
function ListaBuscable({
  opciones,
  valor,
  onElegir,
  etiqueta,
  placeholder,
}: {
  opciones: SubOpcion[];
  valor: string;
  onElegir: (uid: string) => void;
  etiqueta: string;
  placeholder: string;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [activo, setActivo] = useState(0);
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    campo.current?.focus();
  }, []);

  const filtradas = useMemo(() => {
    const q = norm(busqueda.trim());
    if (!q) return opciones;
    return opciones.filter((o) => norm(o.nombre).includes(q) || norm(o.seccion).includes(q));
  }, [opciones, busqueda]);

  // Groupes dans l'ordre d'apparition, chaque groupe trié par numéro.
  const grupos = useMemo(() => {
    const m = new Map<string, SubOpcion[]>();
    for (const o of filtradas) {
      const g = m.get(o.seccion);
      if (g) g.push(o);
      else m.set(o.seccion, [o]);
    }
    return [...m.entries()].map(([sec, items]) => [sec, ordenarPorNumero(items)] as const);
  }, [filtradas]);

  // Liste à plat DANS L'ORDRE AFFICHÉ : garde l'index clavier aligné sur le rendu.
  const planas = useMemo(() => grupos.flatMap(([, items]) => items), [grupos]);

  const teclas = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActivo((i) => Math.min(i + 1, planas.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActivo((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const o = planas[activo];
      if (o) onElegir(o.uid);
    }
  };

  let indice = -1;

  return (
    <>
      <input
        ref={campo}
        type="text"
        value={busqueda}
        onChange={(e) => {
          setBusqueda(e.target.value);
          setActivo(0);
        }}
        onKeyDown={teclas}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full border-b border-[var(--border)] bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)]"
      />
      <ul role="listbox" aria-label={etiqueta} className="max-h-72 overflow-y-auto py-1">
        {planas.length === 0 && (
          <li className="px-3 py-3 text-sm text-[var(--text-muted)]">Sin resultados.</li>
        )}
        {grupos.map(([seccion, items], gi) => {
          const colorSec = COLOR_SECCION[seccion] ?? "var(--text-muted)";
          return (
          <li key={seccion} className={cn(gi > 0 && "mt-1")}>
            {/* En-tête de groupe : bandeau contrasté, jamais sélectionnable.
                Reste collé en haut pendant le défilement → on sait toujours dans
                quelle section on se trouve. Couleur = celle de la typologie. */}
            <p
              className="sticky top-0 z-10 flex items-center gap-2 border-y border-[var(--border)] bg-[var(--app-bg)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider"
              style={{ color: colorSec }}
            >
              <span
                aria-hidden="true"
                className="h-3.5 w-1 shrink-0 rounded-sm"
                style={{ backgroundColor: colorSec }}
              />
              {seccion}
            </p>
            <ul>
              {items.map((o) => {
                indice += 1;
                const i = indice;
                const sel = o.uid === valor;
                return (
                  <li key={o.uid}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={sel}
                      onClick={() => onElegir(o.uid)}
                      onMouseEnter={() => setActivo(i)}
                      className={cn(
                        // pl-5 : entrées légèrement rentrées sous leur bandeau de
                        // section, pour que la hiérarchie se lise au premier coup d'œil.
                        "flex w-full items-center gap-2 py-1.5 pl-5 pr-3 text-left text-sm transition-colors",
                        i === activo && "bg-[var(--app-bg)]",
                        sel ? "font-semibold text-[var(--text)]" : "text-[var(--text-muted)]",
                      )}
                    >
                      {o.color && (
                        <span
                          aria-hidden="true"
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: o.color }}
                        />
                      )}
                      <span className="truncate">{o.nombre}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </li>
          );
        })}
      </ul>
    </>
  );
}

/** Ferme au clic extérieur tant que `abierto`. */
function useCierreExterior(abierto: boolean, cerrar: () => void) {
  const raiz = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) cerrar();
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar();
    };
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto, cerrar]);
  return raiz;
}

// ------------------------------------------------------------
// HojaSelector — Cronograma / Hojas de ruta.
// ------------------------------------------------------------
export function HojaSelector({
  subproyectos,
  valor,
  onChange,
  etiqueta,
}: {
  subproyectos: SubOpcion[];
  valor: string; // "global" | FEUILLE_PAG | uid
  onChange: (uid: string) => void;
  etiqueta: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const raiz = useCierreExterior(abierto, () => setAbierto(false));

  const subActivo = valor !== "global" && valor !== FEUILLE_PAG;
  const nombreActivo = subproyectos.find((s) => s.uid === valor)?.nombre;

  // Rectangulaires (rounded-md), pas de pastilles ovales.
  const base =
    "rounded-md border px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]";
  const activo = "border-[var(--text)] bg-[var(--text)] text-white";
  const inactivo =
    "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--text-muted)] hover:text-[var(--text)]";

  return (
    <nav aria-label={etiqueta} className="flex flex-wrap items-start gap-2">
      <button
        type="button"
        onClick={() => {
          setAbierto(false);
          onChange("global");
        }}
        aria-pressed={valor === "global"}
        className={cn(base, valor === "global" ? activo : inactivo)}
      >
        Proyecto global
      </button>

      {/* Plan d'action genre : feuille non encore définie → bouton INACTIF. */}
      <button
        type="button"
        disabled
        title="Por definir"
        className={cn(
          base,
          "cursor-not-allowed border-dashed border-[var(--border)] bg-[var(--app-bg)] text-[var(--text-muted)] opacity-60",
        )}
      >
        Implementación del PAG
      </button>

      <div ref={raiz} className="relative">
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          aria-haspopup="listbox"
          aria-pressed={subActivo}
          className={cn(base, "flex items-center gap-2", subActivo ? activo : inactivo)}
        >
          <span className="max-w-[22rem] truncate">
            {subActivo && nombreActivo ? nombreActivo : "Subproyectos"}
          </span>
          <span aria-hidden="true" className="shrink-0 opacity-70">
            ▾
          </span>
        </button>

        {abierto && (
          <div className="absolute left-0 z-30 mt-1 w-[min(30rem,90vw)] overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-lg">
            <ListaBuscable
              opciones={subproyectos}
              valor={valor}
              etiqueta={etiqueta}
              placeholder="Buscar subproyecto…"
              onElegir={(uid) => {
                onChange(uid);
                setAbierto(false);
              }}
            />
          </div>
        )}
      </div>
    </nav>
  );
}

// ------------------------------------------------------------
// SubproyectoSelect — Admin (bouton unique + même liste).
// ------------------------------------------------------------
export function SubproyectoSelect({
  opciones,
  valor,
  onChange,
  etiqueta,
  placeholder = "Buscar subproyecto…",
  className,
}: {
  opciones: SubOpcion[];
  valor: string;
  onChange: (uid: string) => void;
  etiqueta: string;
  placeholder?: string;
  className?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const raiz = useCierreExterior(abierto, () => setAbierto(false));
  const seleccionada = opciones.find((o) => o.uid === valor) ?? null;

  return (
    <div ref={raiz} className={cn("relative inline-block", className)}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-label={etiqueta}
        aria-expanded={abierto}
        aria-haspopup="listbox"
        className="flex w-full items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-left text-sm font-medium text-[var(--text)] transition-colors hover:border-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
      >
        <span className="flex min-w-0 items-center gap-2">
          {seleccionada?.color && (
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: seleccionada.color }}
            />
          )}
          <span className="truncate">{seleccionada?.nombre ?? "—"}</span>
        </span>
        <span aria-hidden="true" className="shrink-0 text-[var(--text-muted)]">
          ▾
        </span>
      </button>

      {abierto && (
        <div className="absolute left-0 z-30 mt-1 w-[min(28rem,90vw)] overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-lg">
          <ListaBuscable
            opciones={opciones}
            valor={valor}
            etiqueta={etiqueta}
            placeholder={placeholder}
            onElegir={(uid) => {
              onChange(uid);
              setAbierto(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
