"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";

// ============================================================
// Sélecteur de sous-projet — bouton d'UNE ligne + panneau de recherche.
//
// Remplace la barre de pastilles (une par sous-projet) devenue impraticable :
// 27 sous-projets aux noms officiels longs occupaient une dizaine de lignes et
// repoussaient le contenu hors de l'écran. Ici l'encombrement est constant quel
// que soit le nombre d'entrées.
//
// Surfaces : Cronograma, Hojas de ruta, Admin (gestión de subproyectos).
// ============================================================

export interface SubOpcion {
  uid: string; // valeur retournée ("global" ou un uid SUB-…)
  nombre: string;
  seccion: string; // en-tête de groupe (Aeropuertos / Hospitales / Escuelas / …)
  color?: string; // pastille de typologie, si la surface en affiche une
}

interface SubproyectoSelectProps {
  opciones: SubOpcion[];
  valor: string;
  onChange: (uid: string) => void;
  etiqueta: string; // libellé accessible (aria-label du bouton)
  placeholder?: string;
  className?: string;
}

export function SubproyectoSelect({
  opciones,
  valor,
  onChange,
  etiqueta,
  placeholder = "Buscar subproyecto…",
  className,
}: SubproyectoSelectProps) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [activo, setActivo] = useState(0); // index surligné au clavier
  const raiz = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);

  const seleccionada = opciones.find((o) => o.uid === valor) ?? null;

  // Recherche insensible à la casse et aux accents (« martin » trouve « Martín »).
  const norm = (s: string) =>
    s
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();

  const filtradas = useMemo(() => {
    const q = norm(busqueda.trim());
    if (!q) return opciones;
    return opciones.filter((o) => norm(o.nombre).includes(q) || norm(o.seccion).includes(q));
  }, [opciones, busqueda]);

  // Regroupement par sección, dans l'ordre d'apparition des options.
  const grupos = useMemo(() => {
    const m = new Map<string, SubOpcion[]>();
    for (const o of filtradas) {
      const g = m.get(o.seccion);
      if (g) g.push(o);
      else m.set(o.seccion, [o]);
    }
    return [...m.entries()];
  }, [filtradas]);

  // Liste à plat DANS L'ORDRE AFFICHÉ : garde l'index clavier aligné sur le rendu.
  const planas = useMemo(() => grupos.flatMap(([, items]) => items), [grupos]);

  const cerrar = () => {
    setAbierto(false);
    setBusqueda("");
    setActivo(0);
  };

  const elegir = (uid: string) => {
    onChange(uid);
    cerrar();
  };

  // Fermeture au clic extérieur.
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) cerrar();
    };
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, [abierto]);

  // Focus sur le champ à l'ouverture (pas de setState ici : effet de bord DOM seul).
  useEffect(() => {
    if (abierto) campo.current?.focus();
  }, [abierto]);

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
      if (o) elegir(o.uid);
    } else if (e.key === "Escape") {
      e.preventDefault();
      cerrar();
    }
  };

  let indice = -1; // compteur de rendu, pour retrouver l'index clavier

  return (
    <div ref={raiz} className={cn("relative inline-block", className)}>
      <button
        type="button"
        onClick={() => (abierto ? cerrar() : setAbierto(true))}
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
            {grupos.map(([seccion, items]) => (
              <li key={seccion}>
                {/* En-tête de groupe : purement visuel, jamais sélectionnable. */}
                <p className="px-3 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
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
                          onClick={() => elegir(o.uid)}
                          onMouseEnter={() => setActivo(i)}
                          className={cn(
                            "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors",
                            i === activo ? "bg-[var(--app-bg)]" : "",
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
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
