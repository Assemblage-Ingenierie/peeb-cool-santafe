"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { COMPONENTES } from "@/lib/constants";
import {
  EditableTable,
  type AdminColumn,
  type AdminRow,
  type SelectOption,
} from "./editable-table";
import { addRow, updateField, setFlag, setArrayField, deleteRow } from "@/app/admin/actions";

const TABS = [
  { key: "gp", label: "Gestión de proyecto" },
  { key: "calendario", label: "Calendario" },
  { key: "equipo", label: "Equipo" },
  { key: "capacitaciones", label: "Capacitaciones" },
  { key: "subproyectos", label: "Gestión de subproyectos" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const COMPONENTE_OPTIONS: SelectOption[] = COMPONENTES.map((c) => ({
  value: c.code,
  label: c.nombre,
  color: c.color,
}));
const SEXO_OPTIONS: SelectOption[] = [
  { value: "F", label: "F" },
  { value: "M", label: "M" },
  { value: "X", label: "X" },
];
const MODALIDAD_OPTIONS: SelectOption[] = [
  { value: "Presencial", label: "Presencial" },
  { value: "Virtual", label: "Virtual" },
];

// Hook : état optimiste + persistance réelle (Server Actions) pour une table.
function useAdminTable(tableKey: string, initial: AdminRow[]) {
  const [rows, setRows] = useState<AdminRow[]>(initial);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const run = (fn: () => Promise<void>) =>
    startTransition(async () => {
      try {
        await fn();
      } catch {
        router.refresh(); // resynchro depuis le serveur en cas d'erreur
      }
    });

  const handlers = {
    onCellCommit: (uid: string, key: string, value: string) => {
      setRows((rs) => rs.map((r) => (r.uid === uid ? { ...r, [key]: value } : r)));
      run(() => updateField(tableKey, uid, key, value));
    },
    onMultiCommit: (uid: string, key: string, values: string[]) => {
      setRows((rs) => rs.map((r) => (r.uid === uid ? { ...r, [key]: values } : r)));
      run(() => setArrayField(tableKey, uid, key, values));
    },
    onToggleFlag: (uid: string, flag: "confidencial" | "publicar", value: boolean) => {
      setRows((rs) => rs.map((r) => (r.uid === uid ? { ...r, [flag]: value } : r)));
      run(() => setFlag(tableKey, uid, flag, value));
    },
    onAdd: () =>
      startTransition(async () => {
        try {
          const row = (await addRow(tableKey)) as AdminRow;
          setRows((rs) => [...rs, row]);
        } catch {
          router.refresh();
        }
      }),
    onDelete: (uid: string) => {
      setRows((rs) => rs.filter((r) => r.uid !== uid));
      run(() => deleteRow(tableKey, uid));
    },
  };

  return { rows, handlers };
}

export function AdminTabs({
  gp,
  equipo,
  entidades,
  eventos,
}: {
  gp: AdminRow[];
  equipo: AdminRow[];
  entidades: AdminRow[];
  eventos: AdminRow[];
}) {
  const [active, setActive] = useState<TabKey>("gp");

  const gpT = useAdminTable("gp", gp);
  const equipoT = useAdminTable("equipo", equipo);
  const entidadesT = useAdminTable("entidades", entidades);
  const eventosT = useAdminTable("eventos", eventos);

  // Options dynamiques (dépendent des données vivantes)
  const entidadOptions: SelectOption[] = entidadesT.rows.map((e) => ({
    value: e.uid,
    label: String(e.nombre ?? e.uid),
  }));
  const participanteOptions: SelectOption[] = equipoT.rows.map((p) => ({
    value: p.uid,
    label: `${String(p.apellido ?? "")} ${String(p.nombre ?? "")}`.trim() || p.uid,
  }));

  const gpColumns: AdminColumn[] = [
    { key: "nombre_documento", label: "Documento", type: "text", placeholder: "Nombre del documento" },
    { key: "url", label: "Enlace (URL)", type: "url", placeholder: "https://…" },
  ];

  const equipoColumns: AdminColumn[] = [
    { key: "apellido", label: "Apellido", type: "text", placeholder: "Apellido" },
    { key: "nombre", label: "Nombre", type: "text", placeholder: "Nombre" },
    { key: "entidad_uid", label: "Entidad", type: "select", options: entidadOptions, placeholder: "—" },
    { key: "rol", label: "Rol", type: "text", placeholder: "Rol" },
    { key: "componente", label: "Componente", type: "select", options: COMPONENTE_OPTIONS, placeholder: "—" },
    { key: "telefono", label: "Teléfono", type: "text", placeholder: "Teléfono" },
    { key: "mail", label: "Mail", type: "text", placeholder: "correo@…" },
    { key: "sexo", label: "Sexo", type: "select", options: SEXO_OPTIONS, placeholder: "—" },
  ];

  const entidadesColumns: AdminColumn[] = [
    { key: "nombre", label: "Entidad", type: "text", placeholder: "Nombre de la entidad" },
  ];

  const eventosColumns: AdminColumn[] = [
    { key: "nombre", label: "Evento", type: "text", placeholder: "Nombre del evento" },
    { key: "fecha", label: "Fecha", type: "date" },
    { key: "hora_inicio", label: "Inicio", type: "time" },
    { key: "hora_fin", label: "Fin", type: "time" },
    { key: "componente", label: "Componente", type: "select", options: COMPONENTE_OPTIONS, placeholder: "—" },
    { key: "modalidad", label: "Modalidad", type: "select", options: MODALIDAD_OPTIONS, placeholder: "—" },
    { key: "lugar", label: "Lugar", type: "text", placeholder: "Lugar" },
    { key: "url_conexion", label: "Enlace", type: "url", placeholder: "https://…" },
    { key: "participantes", label: "Participantes", type: "multiselect", options: participanteOptions, placeholder: "—" },
  ];

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
        {active === "gp" && (
          <div className="space-y-10">
            <section>
              <h2 className="text-base font-semibold text-[var(--text)]">Documentación de proyecto</h2>
              <p className="mb-3 mt-1 text-sm text-[var(--text-muted)]">
                <span className="font-medium text-[var(--accent)]">Confidencial</span> controla el acceso
                (oculto para Consultor) ; <span className="font-medium">Publicar</span> controla la
                visibilidad en las páginas públicas. Son ejes independientes.
              </p>
              <EditableTable
                columns={gpColumns}
                rows={gpT.rows}
                showConfidencial
                showPublicar
                {...gpT.handlers}
                addLabel="+ Agregar documento"
                emptyLabel="Sin documentos."
              />
            </section>
            <section>
              <h2 className="text-base font-semibold text-[var(--text)]">Gestión financiera</h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Estructura por definir (CDC §3.3).</p>
              <Placeholder />
            </section>
          </div>
        )}

        {active === "calendario" && (
          <section>
            <h2 className="text-base font-semibold text-[var(--text)]">Eventos</h2>
            <p className="mb-3 mt-1 text-sm text-[var(--text-muted)]">
              Agenda del proyecto. Los eventos alimentan el panel de Inicio.
            </p>
            <EditableTable
              columns={eventosColumns}
              rows={eventosT.rows}
              {...eventosT.handlers}
              addLabel="+ Agregar evento"
              emptyLabel="Sin eventos."
            />
          </section>
        )}

        {active === "equipo" && (
          <div className="space-y-10">
            <section>
              <h2 className="text-base font-semibold text-[var(--text)]">Equipo</h2>
              <p className="mb-3 mt-1 text-sm text-[var(--text-muted)]">
                Personas del proyecto. La entidad se elige entre las registradas más abajo.
              </p>
              <EditableTable
                columns={equipoColumns}
                rows={equipoT.rows}
                {...equipoT.handlers}
                addLabel="+ Agregar persona"
                emptyLabel="Sin personas."
              />
            </section>
            <section>
              <h2 className="text-base font-semibold text-[var(--text)]">Entidades</h2>
              <p className="mb-3 mt-1 text-sm text-[var(--text-muted)]">
                Lista de entidades (no se puede eliminar una entidad usada por una persona).
              </p>
              <EditableTable
                columns={entidadesColumns}
                rows={entidadesT.rows}
                {...entidadesT.handlers}
                addLabel="+ Agregar entidad"
                emptyLabel="Sin entidades."
              />
            </section>
          </div>
        )}

        {(active === "capacitaciones" || active === "subproyectos") && <Placeholder />}
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
