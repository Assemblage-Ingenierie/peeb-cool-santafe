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
  type FilterDef,
} from "./editable-table";
import { SubproyectosPanel } from "./subproyectos-panel";
import { addRow, updateField, setFlag, setArrayField, deleteRow } from "@/app/admin/actions";
import type { SubproyectoRow, MetricaRow } from "@/lib/admin/read";

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
  onColor: c.onColor,
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
// Sous-sections capacitaciones (EE / AyS / G) — subdivisions du tableau (pas une colonne).
const SUBSECCIONES = COMPONENTES.filter((c) => c.code !== "GP");

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
    onAdd: () => add(),
    onDelete: (uid: string) => {
      setRows((rs) => rs.filter((r) => r.uid !== uid));
      run(() => deleteRow(tableKey, uid));
    },
  };

  // `presets` : valeurs préremplies (ex. subseccion du bloc) pour la nouvelle ligne.
  function add(presets?: Record<string, unknown>) {
    startTransition(async () => {
      try {
        const row = (await addRow(tableKey, presets)) as AdminRow;
        setRows((rs) => [...rs, row]);
      } catch {
        router.refresh();
      }
    });
  }

  return { rows, handlers, add };
}

export function AdminTabs({
  gp,
  equipo,
  entidades,
  eventos,
  capdoc,
  capevt,
  subproyectos,
  metricas,
  gestion,
}: {
  gp: AdminRow[];
  equipo: AdminRow[];
  entidades: AdminRow[];
  eventos: AdminRow[];
  capdoc: AdminRow[];
  capevt: AdminRow[];
  subproyectos: SubproyectoRow[];
  metricas: MetricaRow[];
  gestion: AdminRow[];
}) {
  const [active, setActive] = useState<TabKey>("gp");

  const gpT = useAdminTable("gp", gp);
  const equipoT = useAdminTable("equipo", equipo);
  const entidadesT = useAdminTable("entidades", entidades);
  const eventosT = useAdminTable("eventos", eventos);
  const capdocT = useAdminTable("capdoc", capdoc);
  const capevtT = useAdminTable("capevt", capevt);

  // Options dynamiques (dépendent des données vivantes)
  const entidadOptions: SelectOption[] = entidadesT.rows.map((e) => ({
    value: e.uid,
    label: String(e.nombre ?? e.uid),
  }));
  const participanteOptions: SelectOption[] = equipoT.rows.map((p) => ({
    value: p.uid,
    label: `${String(p.apellido ?? "")} ${String(p.nombre ?? "")}`.trim() || p.uid,
  }));
  // Calendario : un evento peut avoir comme participant une persona OU una entidad.
  // (capacitaciones_eventos garde personas seules + son champ entidades dédié.)
  const eventoParticipanteOptions: SelectOption[] = [
    ...participanteOptions,
    ...entidadOptions.map((o) => ({ ...o, label: `${o.label} (entidad)` })),
  ];

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
    { key: "participantes", label: "Participantes", type: "multiselect", options: eventoParticipanteOptions, placeholder: "—" },
  ];

  const equipoFilters: FilterDef[] = [
    { key: "entidad_uid", label: "Entidad", options: entidadOptions, allLabel: "Todas" },
    { key: "componente", label: "Componente", options: COMPONENTE_OPTIONS },
  ];
  const eventosFilters: FilterDef[] = [
    { key: "componente", label: "Componente", options: COMPONENTE_OPTIONS },
  ];

  const documentoOptions: SelectOption[] = capdocT.rows.map((d) => ({
    value: d.uid,
    label: `${String(d.subseccion ?? "")} — ${String(d.titulo ?? "") || d.uid}`,
  }));
  const capdocColumns: AdminColumn[] = [
    { key: "titulo", label: "Título", type: "text", placeholder: "Título" },
    { key: "componente", label: "Componente", type: "select", options: COMPONENTE_OPTIONS, placeholder: "—" },
    { key: "url", label: "Enlace (URL)", type: "url", placeholder: "https://…" },
  ];
  const capevtColumns: AdminColumn[] = [
    { key: "componente", label: "Componente", type: "select", options: COMPONENTE_OPTIONS, placeholder: "—" },
    { key: "documento_uid", label: "Documento", type: "select", options: documentoOptions, placeholder: "—" },
    { key: "fecha_hora", label: "Fecha y hora", type: "datetime" },
    { key: "entidades", label: "Entidades", type: "multiselect", options: entidadOptions, placeholder: "—" },
    { key: "participantes", label: "Participantes", type: "multiselect", options: participanteOptions, placeholder: "—" },
  ];
  const capFilters: FilterDef[] = [{ key: "componente", label: "Componente", options: COMPONENTE_OPTIONS }];

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
              filters={eventosFilters}
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
                filters={equipoFilters}
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

        {active === "capacitaciones" && (
          <div className="space-y-10">
            <section>
              <h2 className="text-base font-semibold text-[var(--text)]">Documentos</h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Material de formación, dividido por subsección.
              </p>
              {SUBSECCIONES.map((sub) => (
                <div key={sub.code} className="mt-5">
                  <SubseccionHeading code={sub.code} nombre={sub.nombre} color={sub.color} onColor={sub.onColor} />
                  <EditableTable
                    columns={capdocColumns}
                    rows={capdocT.rows.filter((r) => r.subseccion === sub.code)}
                    showConfidencial
                    showPublicar
                    {...capdocT.handlers}
                    onAdd={() => capdocT.add({ subseccion: sub.code })}
                    filters={capFilters}
                    addLabel="+ Agregar documento"
                    emptyLabel="Sin documentos."
                  />
                </div>
              ))}
            </section>
            <section>
              <h2 className="text-base font-semibold text-[var(--text)]">Eventos</h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Formaciones realizadas o previstas, divididas por subsección.
              </p>
              {SUBSECCIONES.map((sub) => (
                <div key={sub.code} className="mt-5">
                  <SubseccionHeading code={sub.code} nombre={sub.nombre} color={sub.color} onColor={sub.onColor} />
                  <EditableTable
                    columns={capevtColumns}
                    rows={capevtT.rows.filter((r) => r.subseccion === sub.code)}
                    showConfidencial
                    showPublicar
                    {...capevtT.handlers}
                    onAdd={() => capevtT.add({ subseccion: sub.code })}
                    filters={capFilters}
                    addLabel="+ Agregar evento"
                    emptyLabel="Sin eventos."
                  />
                </div>
              ))}
            </section>
          </div>
        )}

        {active === "subproyectos" && (
          <SubproyectosPanel subproyectos={subproyectos} metricas={metricas} gestionLineas={gestion} />
        )}
      </div>
    </div>
  );
}

function SubseccionHeading({
  code,
  nombre,
  color,
  onColor,
}: {
  code: string;
  nombre: string;
  color: string;
  onColor: string;
}) {
  return (
    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
      <span
        className="inline-block rounded px-2 py-0.5 text-xs font-medium"
        style={{ backgroundColor: color, color: onColor }}
      >
        {code}
      </span>
      {nombre}
    </h3>
  );
}

function Placeholder() {
  return (
    <div className="mt-3 flex items-center justify-center rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-14 text-center text-sm text-[var(--text-muted)]">
      Contenido en construcción.
    </div>
  );
}
