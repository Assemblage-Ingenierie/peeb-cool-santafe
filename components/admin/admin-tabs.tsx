"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { EditableTable, type AdminColumn, type AdminRow } from "./editable-table";
import { DEMO_DOCUMENTACION_GP } from "./demo-data";

const TABS = [
  { key: "gp", label: "Gestión de proyecto" },
  { key: "calendario", label: "Calendario" },
  { key: "equipo", label: "Equipo" },
  { key: "capacitaciones", label: "Capacitaciones" },
  { key: "subproyectos", label: "Gestión de subproyectos" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const GP_COLUMNS: AdminColumn[] = [
  { key: "nombre_documento", label: "Documento", type: "text", placeholder: "Nombre del documento" },
  { key: "url", label: "Enlace (URL)", type: "url", placeholder: "https://…" },
];

export function AdminTabs() {
  const [active, setActive] = useState<TabKey>("gp");
  // Démo locale (Étape 3.1) — persistance réelle branchée ensuite.
  const [gpRows, setGpRows] = useState<AdminRow[]>(DEMO_DOCUMENTACION_GP);

  return (
    <div>
      <div
        role="tablist"
        aria-label="Secciones de administración"
        className="flex flex-wrap gap-1 border-b border-[var(--border)]"
      >
        {TABS.map((t) => {
          const on = active === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setActive(t.key)}
              className={cn(
                "relative px-3 py-2 text-sm font-medium transition-colors",
                on
                  ? "text-[var(--text)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]",
              )}
            >
              {t.label}
              {on && (
                <span
                  className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[var(--accent)]"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="pt-6">
        {active === "gp" ? (
          <div className="space-y-10">
            <section>
              <h2 className="text-base font-semibold text-[var(--text)]">
                Documentación de proyecto
              </h2>
              <p className="mb-3 mt-1 text-sm text-[var(--text-muted)]">
                Edición en línea (clic en una celda). La casilla{" "}
                <span className="font-medium text-[var(--accent)]">Confidencial</span> oculta la
                fila al rol Consultor.
              </p>
              <EditableTable
                columns={GP_COLUMNS}
                rows={gpRows}
                onChange={setGpRows}
                showConfidencial
                onDelete={(uid) =>
                  setGpRows((rows) => rows.filter((r) => r.uid !== uid))
                }
              />
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                Datos de demostración (locales). La persistencia real se conecta al configurar el
                acceso de servidor (service_role).
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[var(--text)]">Gestión financiera</h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Estructura por definir (CDC §3.3).
              </p>
              <Placeholder />
            </section>
          </div>
        ) : (
          <Placeholder />
        )}
      </div>
    </div>
  );
}

function Placeholder() {
  return (
    <div className="mt-3 flex items-center justify-center rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-14 text-center text-sm text-[var(--text-muted)]">
      Contenido en construcción.
    </div>
  );
}
