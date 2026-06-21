"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { COMPONENTES, TIPOLOGIAS, ESTADOS, getTipologia } from "@/lib/constants";
import { TrashIcon } from "@/components/icons";
import { EditableTable, type AdminColumn, type AdminRow, type SelectOption } from "./editable-table";
import { FieldEditor, type FieldDef } from "./field-editor";
import { MedidasEditor } from "./medidas-editor";
import {
  updateSubproyecto,
  updateMetrica,
  updateMedida,
  addSchool,
  deleteSubproyecto,
  addGestionLinea,
  reorderRows,
  updateField,
  setFlag,
  deleteRow,
} from "@/app/admin/actions";
import type { SubproyectoRow, MetricaRow, MedidaRow, Escenario } from "@/lib/admin/read";

// ============================================================
// Gestión de subproyectos (CDC §4.5) : sélecteur (groupé par sección) + 4 sections.
//  1-3 Datos del edificio / faisabilidad / proyecto → édition PAR CHAMP (FieldEditor).
//  4   Gestión del subproyecto → EditableTable (drag&drop orden, url grisée si tipo≠documento).
// État optimiste + persistance via Server Actions (resynchro si erreur).
// ============================================================

const SECCIONES = ["Aeropuertos", "Hospitales", "Escuelas"] as const;

const COMPONENTE_OPTIONS: SelectOption[] = COMPONENTES.map((c) => ({
  value: c.code,
  label: c.nombre,
  color: c.color,
  onColor: c.onColor,
}));
const TIPOLOGIA_OPTIONS: SelectOption[] = TIPOLOGIAS.map((t) => ({
  value: t.code,
  label: t.nombre,
  color: t.color,
  onColor: t.onColor,
}));
const ESTADO_OPTIONS: SelectOption[] = ESTADOS.map((e) => ({
  value: e.code,
  label: e.nombre,
  color: e.color,
  onColor: e.onColor,
}));

const EDIFICIO_FIELDS: FieldDef[] = [
  { key: "nombre", label: "Nombre", type: "text", placeholder: "Nombre del edificio" },
  { key: "tipologia", label: "Tipología", type: "select", options: TIPOLOGIA_OPTIONS, required: true },
  { key: "direccion", label: "Dirección", type: "text", placeholder: "Dirección" },
  { key: "lat", label: "Latitud", type: "number" },
  { key: "lng", label: "Longitud", type: "number" },
  { key: "superficie_m2", label: "Superficie", type: "number", suffix: "m²" },
  { key: "notas", label: "Notas", type: "richtext" },
];

const ENERGIA_FIELDS: FieldDef[] = [
  { key: "demanda_kwh", label: "Demanda antes", type: "number", suffix: "kWh" },
  { key: "demanda_despues_kwh", label: "Demanda después", type: "number", suffix: "kWh" },
  { key: "gei_antes_tco2", label: "GEI antes", type: "number", suffix: "tCO₂" },
  { key: "gei_despues_tco2", label: "GEI después", type: "number", suffix: "tCO₂" },
  { key: "costo_ee_eur", label: "Costo EE", type: "number", suffix: "€" },
  { key: "costo_otras_eur", label: "Costo otras medidas", type: "number", suffix: "€" },
];

const BENEF_FIELDS: FieldDef[] = [
  { key: "benef_personal", label: "Personal", type: "number", integer: true },
  { key: "benef_personal_pct_muj", label: "Personal · % mujeres", type: "number" },
  { key: "benef_usuarios", label: "Usuarios", type: "number", integer: true },
  { key: "benef_usuarios_pct_muj", label: "Usuarios · % mujeres", type: "number" },
  { key: "benef_indirectos", label: "Indirectos", type: "number", integer: true },
  { key: "benef_indirectos_pct_muj", label: "Indirectos · % mujeres", type: "number" },
];

// Documentos : tableau libre (style Airtable). Plus de colonnes Tipo/Fase ; url toujours active.
const documentosColumns: AdminColumn[] = [
  { key: "titulo", label: "Título", type: "text", placeholder: "Título" },
  { key: "componente", label: "Componente", type: "select", options: COMPONENTE_OPTIONS, placeholder: "—" },
  { key: "url", label: "Enlace (URL)", type: "url", placeholder: "https://…" },
  { key: "estado", label: "Estado", type: "select", options: ESTADO_OPTIONS, placeholder: "—" },
  { key: "fecha", label: "Fecha", type: "date" },
];

// Fases : liste fixe (1 ligne par fase). Nom de fase en lecture seule + estado + 2 dates.
const fasesColumns: AdminColumn[] = [
  { key: "titulo", label: "Fase", readOnly: true },
  { key: "estado", label: "Estado", type: "select", options: ESTADO_OPTIONS, placeholder: "—" },
  { key: "fecha_inicio", label: "Fecha inicio", type: "date" },
  { key: "fecha_fin", label: "Fecha fin", type: "date" },
];

function emptyMetrica(subUid: string, escenario: Escenario): MetricaRow {
  return {
    subproyecto_uid: subUid,
    escenario,
    demanda_kwh: null,
    demanda_despues_kwh: null,
    gei_antes_tco2: null,
    gei_despues_tco2: null,
    costo_ee_eur: null,
    costo_otras_eur: null,
    benef_personal: null,
    benef_personal_pct_muj: null,
    benef_usuarios: null,
    benef_usuarios_pct_muj: null,
    benef_indirectos: null,
    benef_indirectos_pct_muj: null,
  };
}

export function SubproyectosPanel({
  subproyectos: initialSubs,
  metricas: initialMetricas,
  gestionLineas: initialGestion,
  medidas: initialMedidas,
}: {
  subproyectos: SubproyectoRow[];
  metricas: MetricaRow[];
  gestionLineas: AdminRow[];
  medidas: MedidaRow[];
}) {
  const [subs, setSubs] = useState<SubproyectoRow[]>(initialSubs);
  const [metricas, setMetricas] = useState<MetricaRow[]>(initialMetricas);
  const [gestion, setGestion] = useState<AdminRow[]>(initialGestion);
  const [medidas, setMedidas] = useState<MedidaRow[]>(initialMedidas);
  const [selectedUid, setSelectedUid] = useState<string | null>(initialSubs[0]?.uid ?? null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Sélectionne un sous-projet et referme une éventuelle confirmation de suppression.
  const selectSub = (uid: string) => {
    setSelectedUid(uid);
    setConfirmingDelete(false);
  };

  const run = (fn: () => Promise<void>) =>
    startTransition(async () => {
      try {
        await fn();
      } catch {
        router.refresh();
      }
    });

  const selected = subs.find((s) => s.uid === selectedUid) ?? null;
  const fais = metricas.find((m) => m.subproyecto_uid === selectedUid && m.escenario === "faisabilidad") ?? null;
  const proy = metricas.find((m) => m.subproyecto_uid === selectedUid && m.escenario === "proyecto") ?? null;
  const gestionDocs = useMemo(
    () => gestion.filter((g) => g.subproyecto_uid === selectedUid && g.tipo_linea !== "etapa"),
    [gestion, selectedUid],
  );
  const gestionFases = useMemo(
    () =>
      gestion
        .filter((g) => g.subproyecto_uid === selectedUid && g.tipo_linea === "etapa")
        .sort((a, b) => Number(a.orden ?? 0) - Number(b.orden ?? 0)),
    [gestion, selectedUid],
  );

  // --- Section 1 : Datos del edificio ---
  const onSubField = (key: string, value: string) => {
    if (!selectedUid) return;
    setSubs((rs) => rs.map((r) => (r.uid === selectedUid ? { ...r, [key]: value } : r)));
    run(() => updateSubproyecto(selectedUid, key, value));
  };

  // --- Sections 2-3 : métriques ---
  const onMetricaField = (escenario: Escenario) => (key: string, value: string) => {
    if (!selectedUid) return;
    setMetricas((rs) =>
      rs.map((r) =>
        r.subproyecto_uid === selectedUid && r.escenario === escenario ? { ...r, [key]: value } : r,
      ),
    );
    run(() => updateMetrica(selectedUid, escenario, key, value));
  };

  // --- Section 3 : mesures du projet (table medidas) ---
  const medidasOfSelected = useMemo(
    () => medidas.filter((m) => m.subproyecto_uid === selectedUid),
    [medidas, selectedUid],
  );
  const setMedidaLocal = (medida: string, patch: Partial<MedidaRow>) =>
    setMedidas((rs) =>
      rs.map((r) => (r.subproyecto_uid === selectedUid && r.medida === medida ? { ...r, ...patch } : r)),
    );
  const onMedidaToggle = (medida: string, activa: boolean) => {
    if (!selectedUid) return;
    setMedidaLocal(medida, { activa });
    run(() => updateMedida(selectedUid, medida, "activa", activa ? "true" : "false"));
  };
  const onMedidaText = (medida: string, texto: string) => {
    if (!selectedUid) return;
    setMedidaLocal(medida, { texto: texto.trim() === "" ? null : texto });
    run(() => updateMedida(selectedUid, medida, "texto", texto));
  };
  const onMedidaKwh = (medida: string, value: string) => {
    if (!selectedUid) return;
    const n = value.trim() === "" ? null : Number(value.replace(",", "."));
    setMedidaLocal(medida, { kwh_anual: n === null || Number.isNaN(n) ? null : n });
    run(() => updateMedida(selectedUid, medida, "kwh_anual", value));
  };

  // --- Section 4 : gestion_lineas ---
  const gestionHandlers = {
    onCellCommit: (uid: string, key: string, value: string) => {
      setGestion((rs) => rs.map((r) => (r.uid === uid ? { ...r, [key]: value } : r)));
      run(() => updateField("gestion", uid, key, value));
    },
    onToggleFlag: (uid: string, flag: string, value: boolean) => {
      setGestion((rs) => rs.map((r) => (r.uid === uid ? { ...r, [flag]: value } : r)));
      run(() => setFlag("gestion", uid, flag, value));
    },
    onDelete: (uid: string) => {
      setGestion((rs) => rs.filter((r) => r.uid !== uid));
      run(() => deleteRow("gestion", uid));
    },
    onAdd: () => {
      if (!selectedUid) return;
      startTransition(async () => {
        try {
          const row = (await addGestionLinea(selectedUid)) as AdminRow;
          setGestion((rs) => [...rs, row]);
        } catch {
          router.refresh();
        }
      });
    },
    onReorder: (orderedUids: string[]) => {
      if (!selectedUid) return;
      setGestion((prev) => {
        // On ne réordonne que les DOCUMENTS du sous-projet courant ; on préserve tout le reste
        // (autres sous-projets + les lignes de fase du sous-projet courant).
        const others = prev.filter((g) => g.subproyecto_uid !== selectedUid || g.tipo_linea === "etapa");
        const byUid = new Map(
          prev
            .filter((g) => g.subproyecto_uid === selectedUid && g.tipo_linea !== "etapa")
            .map((r) => [r.uid, r] as const),
        );
        const reordered: AdminRow[] = [];
        orderedUids.forEach((uid, i) => {
          const r = byUid.get(uid);
          if (r) reordered.push({ ...r, orden: i + 1 });
        });
        return [...others, ...reordered];
      });
      run(() => reorderRows("gestion", orderedUids));
    },
  };

  // --- Ajout d'une école ---
  const submitSchool = () => {
    startTransition(async () => {
      try {
        const { sub, fases } = await addSchool(newName);
        setSubs((rs) => [...rs, sub]);
        setMetricas((rs) => [...rs, emptyMetrica(sub.uid, "faisabilidad"), emptyMetrica(sub.uid, "proyecto")]);
        setGestion((rs) => [...rs, ...(fases as AdminRow[])]);
        setSelectedUid(sub.uid);
        setAdding(false);
        setNewName("");
      } catch {
        router.refresh();
      }
    });
  };

  // --- Suppression d'une école (uniquement Escuelas) ---
  const deleteSchool = () => {
    if (!selected || selected.seccion !== "Escuelas") return;
    const uid = selected.uid;
    const remaining = subs.filter((s) => s.uid !== uid);
    setSubs(remaining);
    setMetricas((rs) => rs.filter((m) => m.subproyecto_uid !== uid));
    setGestion((rs) => rs.filter((g) => g.subproyecto_uid !== uid));
    setSelectedUid(remaining[0]?.uid ?? null);
    setConfirmingDelete(false);
    run(() => deleteSubproyecto(uid));
  };

  return (
    <div className="space-y-6">
      {/* Sélecteur */}
      <div className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        {SECCIONES.map((sec) => {
          const items = subs.filter((s) => s.seccion === sec);
          if (items.length === 0 && sec !== "Escuelas") return null;
          return (
            <div key={sec}>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{sec}</p>
              <div className="flex flex-wrap gap-1.5">
                {items.map((s) => {
                  const on = s.uid === selectedUid;
                  const tip = getTipologia(s.tipologia);
                  return (
                    <button
                      key={s.uid}
                      type="button"
                      onClick={() => selectSub(s.uid)}
                      aria-pressed={on}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors",
                        on
                          ? "border-[var(--focus)] bg-[var(--app-bg)] font-medium text-[var(--text)]"
                          : "border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--app-bg)] hover:text-[var(--text)]",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: tip?.color ?? "var(--border)" }}
                      />
                      {s.nombre}
                    </button>
                  );
                })}
                {sec === "Escuelas" &&
                  (adding ? (
                    <span className="inline-flex flex-wrap items-center gap-1.5 rounded-md border border-[var(--focus)] px-2 py-1">
                      <input
                        autoFocus
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Nombre de la escuela"
                        className="w-52 rounded-sm border border-[var(--border)] bg-[var(--app-bg)] px-2 py-1 text-sm text-[var(--text)] outline-none focus:border-[var(--focus)]"
                      />
                      <button
                        type="button"
                        onClick={submitSchool}
                        className="rounded-md bg-[var(--text)] px-2.5 py-1 text-sm font-medium text-white transition-opacity hover:opacity-90"
                      >
                        Agregar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAdding(false);
                          setNewName("");
                        }}
                        className="rounded-md px-2 py-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
                      >
                        Cancelar
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAdding(true)}
                      className="inline-flex items-center rounded-md border border-dashed border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--app-bg)] hover:text-[var(--text)]"
                    >
                      + Agregar escuela
                    </button>
                  ))}
              </div>
            </div>
          );
        })}
      </div>

      {!selected ? (
        <p className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-14 text-center text-sm text-[var(--text-muted)]">
          Seleccioná un subproyecto.
        </p>
      ) : (
        <div className="space-y-10">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-[var(--text)]">{selected.nombre}</h2>
            <code className="rounded bg-[var(--app-bg)] px-1.5 py-0.5 text-xs text-[var(--text-muted)]">{selected.uid}</code>
            {selected.seccion === "Escuelas" &&
              (confirmingDelete ? (
                <span className="ml-auto inline-flex flex-wrap items-center gap-2 rounded-md border border-[var(--accent)] bg-[var(--surface)] px-2 py-1">
                  <span className="text-sm text-[var(--text)]">
                    ¿Eliminar «&nbsp;{selected.nombre}&nbsp;» y todos sus datos? No se puede deshacer.
                  </span>
                  <button
                    type="button"
                    onClick={deleteSchool}
                    className="rounded-md px-2.5 py-1 text-sm font-medium text-white"
                    style={{ backgroundColor: "var(--accent)" }}
                  >
                    Sí, eliminar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    className="rounded-md px-2 py-1 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
                  >
                    Cancelar
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] px-2.5 py-1.5 text-sm text-[var(--text-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  <TrashIcon className="h-4 w-4" />
                  Eliminar escuela
                </button>
              ))}
          </div>

          {/* Section 1 */}
          <section>
            <h3 className="mb-3 text-base font-semibold text-[var(--text)]">Datos del edificio</h3>
            <FieldEditor fields={EDIFICIO_FIELDS} values={selected as unknown as Record<string, unknown>} onCommit={onSubField} />
          </section>

          {/* Section 2 */}
          <section>
            <h3 className="mb-1 text-base font-semibold text-[var(--text)]">Datos de la factibilidad</h3>
            <p className="mb-3 text-sm text-[var(--text-muted)]">Valores del escenario de factibilidad. Vacío = «&nbsp;—&nbsp;» (dato faltante), nunca 0.</p>
            <FieldEditor
              fields={ENERGIA_FIELDS}
              values={(fais ?? {}) as unknown as Record<string, unknown>}
              onCommit={onMetricaField("faisabilidad")}
            />
            <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Beneficiarios</p>
            <FieldEditor
              fields={BENEF_FIELDS}
              values={(fais ?? {}) as unknown as Record<string, unknown>}
              onCommit={onMetricaField("faisabilidad")}
            />
          </section>

          {/* Section 3 */}
          <section>
            <h3 className="mb-1 text-base font-semibold text-[var(--text)]">Datos de proyecto</h3>
            <p className="mb-3 text-sm text-[var(--text-muted)]">Valores del escenario de proyecto (sin beneficiarios).</p>
            <FieldEditor
              fields={ENERGIA_FIELDS}
              values={(proy ?? {}) as unknown as Record<string, unknown>}
              onCommit={onMetricaField("proyecto")}
            />

            <h4 className="mb-1 mt-6 text-sm font-semibold text-[var(--text)]">Medidas del proyecto</h4>
            <p className="mb-3 text-sm text-[var(--text-muted)]">
              Marcá las medidas aplicadas. Texto libre + ahorro kWh/año (vacío = «&nbsp;—&nbsp;», nunca 0).
            </p>
            <MedidasEditor
              subUid={selected.uid}
              rows={medidasOfSelected}
              onToggle={onMedidaToggle}
              onText={onMedidaText}
              onKwh={onMedidaKwh}
            />
          </section>

          {/* Section 4 : Gestión del subproyecto → Documentos + Fases */}
          <section className="space-y-8">
            <h3 className="text-base font-semibold text-[var(--text)]">Gestión del subproyecto</h3>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-[var(--text)]">Documentos</h4>
              <EditableTable
                columns={documentosColumns}
                rows={gestionDocs}
                showConfidencial
                showPublicar
                {...gestionHandlers}
                addLabel="+ Agregar documento"
                emptyLabel="Sin documentos."
              />
            </div>

            <div>
              <h4 className="mb-1 text-sm font-semibold text-[var(--text)]">Fases</h4>
              <p className="mb-2 text-sm text-[var(--text-muted)]">Estado y fechas (inicio / fin) por fase del proyecto.</p>
              <EditableTable
                columns={fasesColumns}
                rows={gestionFases}
                onCellCommit={gestionHandlers.onCellCommit}
                hideUid
                hideSearch
                emptyLabel="Sin fases."
              />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
