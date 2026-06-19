"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { EditableTable, type AdminColumn } from "./editable-table";
import type { GpRow } from "@/lib/admin/gp";
import { addGp, updateGpField, setGpFlag, deleteGp } from "@/app/admin/actions";

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

export function AdminTabs({ initialGp }: { initialGp: GpRow[] }) {
  const [active, setActive] = useState<TabKey>("gp");
  const [gpRows, setGpRows] = useState<GpRow[]>(initialGp);
  const [, startTransition] = useTransition();
  const router = useRouter();

  // Mises à jour optimistes + persistance réelle (Server Actions). En cas d'erreur,
  // on resynchronise depuis le serveur (router.refresh()).
  const handleCellCommit = (uid: string, key: string, value: string) => {
    setGpRows((rows) =>
      rows.map((r) =>
        r.uid === uid ? { ...r, [key]: key === "url" && value.trim() === "" ? null : value } : r,
      ),
    );
    startTransition(async () => {
      try {
        await updateGpField(uid, key, value);
      } catch {
        router.refresh();
      }
    });
  };

  const handleToggle = (uid: string, flag: "confidencial" | "publicar", value: boolean) => {
    setGpRows((rows) => rows.map((r) => (r.uid === uid ? { ...r, [flag]: value } : r)));
    startTransition(async () => {
      try {
        await setGpFlag(uid, flag, value);
      } catch {
        router.refresh();
      }
    });
  };

  const handleAdd = () => {
    startTransition(async () => {
      try {
        const row = await addGp();
        setGpRows((rows) => [...rows, row]);
      } catch {
        router.refresh();
      }
    });
  };

  const handleDelete = (uid: string) => {
    setGpRows((rows) => rows.filter((r) => r.uid !== uid));
    startTransition(async () => {
      try {
        await deleteGp(uid);
      } catch {
        router.refresh();
      }
    });
  };

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
                on ? "text-[var(--text)]" : "text-[var(--text-muted)] hover:text-[var(--text)]",
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
                Edición en línea (clic en una celda).{" "}
                <span className="font-medium text-[var(--accent)]">Confidencial</span> controla el
                acceso (oculto para Consultor) ; <span className="font-medium">Publicar</span>{" "}
                controla la visibilidad en las páginas públicas. Son ejes independientes.
              </p>
              <EditableTable
                columns={GP_COLUMNS}
                rows={gpRows}
                showConfidencial
                showPublicar
                onCellCommit={handleCellCommit}
                onToggleConfidencial={(uid, v) => handleToggle(uid, "confidencial", v)}
                onTogglePublicar={(uid, v) => handleToggle(uid, "publicar", v)}
                onAdd={handleAdd}
                onDelete={handleDelete}
                addLabel="+ Agregar documento"
                emptyLabel="Sin documentos."
              />
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
