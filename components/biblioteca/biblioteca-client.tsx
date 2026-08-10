"use client";

import { useMemo, type ReactNode } from "react";
import { COMPONENTES, UI } from "@/lib/constants";
import { useComponentFilters, pasaFiltro } from "@/components/filter-context";
import { useSnapshot } from "@/components/dashboard/use-snapshot";
import type { SnapshotDocProyecto } from "@/lib/snapshot";

// Biblioteca — « Documentación de proyecto » (table peebcoolsf_documentacion_gp),
// desplazada desde el bloque « Documentos » del Inicio. UNA sección por componente
// (GP / EE / AyS / G, cada una aparte, + « Otros » sin componente), con encabezado
// de color pleno como los bloques « Medidas » del Inicio. Respeta el filtro de
// componente del header. La confidencialidad (RLS `confidencial`) y « publicar » ya
// se aplican en el snapshot → aquí sólo llegan los documentos visibles para el rol.

// « Otros » (sin composante) : encabezado neutro, comme le groupe null des medidas.
const SECCION_OTROS = { code: "otros", nombre: "Otros documentos", color: UI.appBg, onColor: UI.text };

interface Grupo {
  code: string;
  nombre: string;
  color: string;
  onColor: string;
  docs: SnapshotDocProyecto[];
}

export function BibliotecaClient() {
  const snap = useSnapshot();
  const filtros = useComponentFilters();

  const grupos = useMemo<Grupo[]>(() => {
    if (snap.status !== "ready") return [];
    const docs = snap.data.docsProyecto;
    const salida: Grupo[] = [];
    for (const c of COMPONENTES) {
      if (!pasaFiltro(filtros, c.code)) continue;
      const suyos = docs.filter((d) => d.componente === c.code);
      if (suyos.length > 0) {
        salida.push({ code: c.code, nombre: c.nombre, color: c.color, onColor: c.onColor, docs: suyos });
      }
    }
    // Documents sans composante rattachée → toujours visibles (non liés à un filtre).
    const sin = docs.filter((d) => !COMPONENTES.some((c) => c.code === d.componente));
    if (sin.length > 0) salida.push({ ...SECCION_OTROS, docs: sin });
    return salida;
  }, [snap, filtros]);

  return (
    <section className="mx-auto max-w-5xl">
      <h1 className="text-xl font-semibold tracking-tight text-[var(--text)]">Biblioteca</h1>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        Documentación del proyecto, agrupada por componente.
      </p>

      <div className="mt-6">
        {snap.status === "error" ? (
          <Hint>No se pudieron cargar los documentos.</Hint>
        ) : snap.status === "loading" ? (
          <Hint>Cargando…</Hint>
        ) : grupos.length === 0 ? (
          <Hint>Sin documentos.</Hint>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {grupos.map((g) => (
              <div
                key={g.code}
                className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]"
              >
                <h2
                  className="px-4 py-2 text-sm font-semibold"
                  style={{ backgroundColor: g.color, color: g.onColor }}
                >
                  {g.nombre}
                </h2>
                <ul className="divide-y divide-[var(--border)] px-4 pb-2 pt-1">
                  {g.docs.map((d) => (
                    <li key={d.uid}>
                      {d.url ? (
                        <a
                          href={d.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block py-2 text-sm text-[var(--focus)] underline-offset-2 transition-colors hover:underline"
                        >
                          {d.nombre}
                        </a>
                      ) : (
                        <span className="block py-2 text-sm text-[var(--text-muted)]" title="Sin enlace">
                          {d.nombre}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-center rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-16 text-center text-sm text-[var(--text-muted)]">
      {children}
    </div>
  );
}
