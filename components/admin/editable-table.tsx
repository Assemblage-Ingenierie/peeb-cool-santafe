"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { TrashIcon, SearchIcon } from "@/components/icons";
import { CopyButton } from "./copy-button";

// ============================================================
// Tableau éditable réutilisable (style Airtable).
// Types de colonne : text | url | select | date | time | multiselect.
// - Recherche/filtre client (UID + colonnes texte) — aucune requête DB
// - select / multiselect / filtres : dropdown PERSONNALISÉ rendu en PORTAIL
//   (échappe aux overflow → jamais rogné, même si le tableau est court).
// - Confidencial (checkbox ROUGE = accès/RLS) et Publicar (interrupteur neutre
//   = affichage) restent deux axes indépendants, visuellement distincts.
// Aucune couleur en dur : tokens lib/constants.ts (sauf couleurs passées en options).
// ============================================================

export type AdminColumnType = "text" | "url" | "select" | "date" | "time" | "datetime" | "multiselect";

export interface SelectOption {
  value: string;
  label: string;
  color?: string; // fond du badge
  onColor?: string; // couleur du texte sur `color`
}

// Filtre structuré (client) sur la valeur d'une colonne (ex. entidad, componente).
export interface FilterDef {
  key: string;
  label: string;
  options: SelectOption[];
  allLabel?: string; // libellé « tout » (défaut « Todos »)
}

export interface AdminColumn {
  key: string;
  label: string;
  type?: AdminColumnType; // défaut : text
  placeholder?: string;
  options?: SelectOption[]; // select / multiselect
  required?: boolean; // select : pas d'option « vide »
  isDisabled?: (row: AdminRow) => boolean;
}

export interface AdminRow {
  uid: string;
  [key: string]: unknown;
}

interface EditableTableProps {
  columns: AdminColumn[];
  rows: AdminRow[];
  showConfidencial?: boolean;
  showPublicar?: boolean;
  onCellCommit?: (uid: string, key: string, value: string) => void;
  onMultiCommit?: (uid: string, key: string, values: string[]) => void;
  onToggleFlag?: (uid: string, flag: "confidencial" | "publicar", value: boolean) => void;
  onDelete?: (uid: string) => void;
  onAdd?: () => void;
  /** Active le drag & drop : reçoit l'ordre des UID après déplacement. */
  onReorder?: (orderedUids: string[]) => void;
  addLabel?: string;
  emptyLabel?: string;
  searchPlaceholder?: string;
  filters?: FilterDef[];
}

export function EditableTable({
  columns,
  rows,
  showConfidencial = false,
  showPublicar = false,
  onCellCommit,
  onMultiCommit,
  onToggleFlag,
  onDelete,
  onAdd,
  onReorder,
  addLabel = "+ Agregar fila",
  emptyLabel = "Sin registros.",
  searchPlaceholder = "Buscar…",
  filters,
}: EditableTableProps) {
  const [query, setQuery] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [dragUid, setDragUid] = useState<string | null>(null);
  const [overUid, setOverUid] = useState<string | null>(null);

  const hasFilterActive = query.trim() !== "" || Object.values(filterValues).some(Boolean);
  const reorderable = Boolean(onReorder);
  // Le drag n'a de sens que sur la liste complète et stable (sinon réordonnancement ambigu).
  const canReorder = reorderable && !hasFilterActive;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      for (const f of filters ?? []) {
        const sel = filterValues[f.key];
        if (sel && String(row[f.key] ?? "") !== sel) return false;
      }
      if (!q) return true;
      if (row.uid.toLowerCase().includes(q)) return true;
      return columns.some((c) => {
        const v = row[c.key];
        return typeof v === "string" && v.toLowerCase().includes(q);
      });
    });
  }, [rows, columns, query, filters, filterValues]);

  function handleDrop(targetUid: string) {
    const from = dragUid;
    setDragUid(null);
    setOverUid(null);
    if (!from || from === targetUid) return;
    const order = rows.map((r) => r.uid);
    const fromIdx = order.indexOf(from);
    const toIdx = order.indexOf(targetUid);
    if (fromIdx < 0 || toIdx < 0) return;
    order.splice(fromIdx, 1);
    order.splice(toIdx, 0, from);
    onReorder?.(order);
  }

  const colCount =
    (reorderable ? 1 : 0) +
    (showConfidencial ? 1 : 0) +
    columns.length +
    (showPublicar ? 1 : 0) +
    1 +
    (onDelete ? 1 : 0);

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] p-2">
        <div className="relative w-full min-w-[12rem] max-w-xs sm:flex-1">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label="Buscar en la tabla"
            className="w-full rounded-md border border-[var(--border)] bg-[var(--app-bg)] py-1.5 pl-8 pr-3 text-sm text-[var(--text)] outline-none focus:border-[var(--focus)]"
          />
        </div>
        {filters?.map((f) => (
          <FilterDropdown
            key={f.key}
            def={f}
            value={filterValues[f.key] ?? ""}
            onChange={(v) => setFilterValues((prev) => ({ ...prev, [f.key]: v }))}
          />
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--app-bg)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              {reorderable && (
                <th scope="col" className="w-px px-1 py-2" title="Arrastrar para reordenar">
                  <span className="sr-only">Orden</span>
                </th>
              )}
              {showConfidencial && (
                <th scope="col" className="w-px whitespace-nowrap px-3 py-2" title="Confidencial — controla el acceso (oculto para Consultor)">
                  Conf.
                </th>
              )}
              {columns.map((c) => (
                <th key={c.key} scope="col" className="px-3 py-2">
                  {c.label}
                </th>
              ))}
              {showPublicar && (
                <th scope="col" className="w-px whitespace-nowrap px-3 py-2" title="Publicar — visible en las páginas públicas (no afecta el acceso)">
                  Publicar
                </th>
              )}
              <th scope="col" className="px-3 py-2">
                UID
              </th>
              {onDelete && (
                <th scope="col" className="w-px px-2 py-2">
                  <span className="sr-only">Acciones</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="px-3 py-10 text-center text-[var(--text-muted)]">
                  {emptyLabel}
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="px-3 py-10 text-center text-[var(--text-muted)]">
                  {query ? `Sin resultados para « ${query} ».` : "Sin resultados con los filtros aplicados."}
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr
                  key={row.uid}
                  onDragOver={
                    canReorder
                      ? (e) => {
                          if (!dragUid) return;
                          e.preventDefault();
                          if (overUid !== row.uid) setOverUid(row.uid);
                        }
                      : undefined
                  }
                  onDrop={canReorder ? () => handleDrop(row.uid) : undefined}
                  className={cn(
                    "border-b border-[var(--border)] last:border-b-0",
                    dragUid === row.uid && "opacity-40",
                    canReorder && overUid === row.uid && dragUid !== row.uid && "border-t-2 border-t-[var(--focus)]",
                  )}
                >
                  {reorderable && (
                    <td className="px-1 py-1.5 align-middle">
                      <span
                        draggable={canReorder}
                        onDragStart={canReorder ? () => setDragUid(row.uid) : undefined}
                        onDragEnd={() => {
                          setDragUid(null);
                          setOverUid(null);
                        }}
                        aria-label={`Reordenar ${row.uid}`}
                        title={canReorder ? "Arrastrar para reordenar" : "Quitar el filtro/búsqueda para reordenar"}
                        className={cn(
                          "flex h-7 w-6 items-center justify-center text-[var(--text-muted)]",
                          canReorder ? "cursor-grab active:cursor-grabbing hover:text-[var(--text)]" : "cursor-not-allowed opacity-40",
                        )}
                      >
                        <DragHandleIcon className="h-4 w-4" />
                      </span>
                    </td>
                  )}
                  {showConfidencial && (
                    <td className="px-3 py-1.5 align-middle">
                      <input
                        type="checkbox"
                        checked={Boolean(row.confidencial)}
                        onChange={(e) => onToggleFlag?.(row.uid, "confidencial", e.target.checked)}
                        aria-label={`Confidencial — ${row.uid}`}
                        title="Confidencial (controla el acceso, oculto para Consultor)"
                        className="h-4 w-4 cursor-pointer"
                        style={{ accentColor: "var(--accent)" }}
                      />
                    </td>
                  )}

                  {columns.map((col) =>
                    col.type === "multiselect" ? (
                      <td key={col.key} className="align-middle">
                        <MultiSelectCell row={row} column={col} onCommit={(vals) => onMultiCommit?.(row.uid, col.key, vals)} />
                      </td>
                    ) : col.type === "select" ? (
                      <td key={col.key} className="align-middle">
                        <SelectCell row={row} column={col} onCommit={(v) => onCellCommit?.(row.uid, col.key, v)} />
                      </td>
                    ) : (
                      <td key={col.key} className="align-middle">
                        <EditableCell row={row} column={col} onCommit={(v) => onCellCommit?.(row.uid, col.key, v)} />
                      </td>
                    ),
                  )}

                  {showPublicar && (
                    <td className="px-3 py-1.5 align-middle">
                      <PublishToggle on={Boolean(row.publicar)} uid={row.uid} onToggle={(v) => onToggleFlag?.(row.uid, "publicar", v)} />
                    </td>
                  )}

                  <td className="whitespace-nowrap px-3 py-1.5 align-middle">
                    <span className="inline-flex items-center gap-1">
                      <code className="rounded bg-[var(--app-bg)] px-1.5 py-0.5 text-xs text-[var(--text-muted)]">
                        {row.uid}
                      </code>
                      <CopyButton value={row.uid} label={`Copiar UID ${row.uid}`} />
                    </span>
                  </td>

                  {onDelete && (
                    <td className="px-2 py-1.5 align-middle">
                      <button
                        type="button"
                        onClick={() => onDelete(row.uid)}
                        aria-label={`Eliminar ${row.uid}`}
                        title="Eliminar"
                        className="inline-flex h-7 w-7 items-center justify-center rounded text-[var(--text-muted)] transition-colors hover:bg-[var(--app-bg)] hover:text-[var(--accent)]"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {onAdd && (
        <div className="border-t border-[var(--border)] p-2">
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--app-bg)] hover:text-[var(--text)]"
          >
            {addLabel}
          </button>
        </div>
      )}
    </div>
  );
}

// --- Panneau flottant rendu en portail (échappe aux overflow) -----------------

function PortalPanel({
  anchorRef,
  open,
  onClose,
  align = "start",
  width = 224,
  children,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  align?: "start" | "end";
  width?: number;
  children: React.ReactNode;
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!open || !anchorRef.current) {
      setRect(null);
      return;
    }
    setRect(anchorRef.current.getBoundingClientRect());
    // En cas de scroll/resize, on ferme (évite un panneau positionné de façon obsolète).
    const close = () => onClose();
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open, anchorRef, onClose]);

  if (!open || !rect) return null;

  const rawLeft = align === "end" ? rect.right - width : rect.left;
  const left = Math.max(8, Math.min(rawLeft, window.innerWidth - width - 8));
  const spaceBelow = window.innerHeight - rect.bottom;
  const openUp = spaceBelow < 240 && rect.top > spaceBelow;
  const vStyle: React.CSSProperties = openUp
    ? { bottom: window.innerHeight - rect.top + 4, maxHeight: rect.top - 16 }
    : { top: rect.bottom + 4, maxHeight: spaceBelow - 16 };

  return createPortal(
    <>
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
        className="fixed inset-0 z-40 cursor-default"
      />
      <div
        role="listbox"
        style={{ position: "fixed", left, width, ...vStyle }}
        className="z-50 overflow-auto rounded-md border border-[var(--border)] bg-[var(--surface)] p-1 shadow-lg"
      >
        {children}
      </div>
    </>,
    document.body,
  );
}

// --- Badge coloré --------------------------------------------------------------

function Badge({ option }: { option: SelectOption }) {
  if (option.color) {
    return (
      <span
        className="inline-block rounded px-2 py-0.5 text-xs font-medium"
        style={{ backgroundColor: option.color, color: option.onColor ?? "var(--text)" }}
      >
        {option.label}
      </span>
    );
  }
  return <span className="text-sm text-[var(--text)]">{option.label}</span>;
}

// --- Filtre déroulant (par entidad, componente…) ------------------------------

function FilterDropdown({
  def,
  value,
  onChange,
}: {
  def: FilterDef;
  value: string;
  onChange: (value: string) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const current = def.options.find((o) => o.value === value);
  const allLabel = def.allLabel ?? "Todos";
  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm transition-colors",
          value ? "border-[var(--focus)]" : "border-[var(--border)] hover:bg-[var(--app-bg)]",
        )}
      >
        <span className="text-[var(--text-muted)]">{def.label}:</span>
        {current ? <Badge option={current} /> : <span className="text-[var(--text)]">{allLabel}</span>}
      </button>
      <PortalPanel anchorRef={ref} open={open} onClose={() => setOpen(false)} align="end" width={224}>
        <button
          type="button"
          role="option"
          aria-selected={value === ""}
          onClick={() => pick("")}
          className={cn(
            "flex w-full items-center rounded px-2 py-1.5 text-left text-sm text-[var(--text)] hover:bg-[var(--app-bg)]",
            value === "" && "bg-[var(--app-bg)]",
          )}
        >
          {allLabel}
        </button>
        {def.options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="option"
            aria-selected={o.value === value}
            onClick={() => pick(o.value)}
            className={cn(
              "flex w-full items-center rounded px-2 py-1.5 text-left hover:bg-[var(--app-bg)]",
              o.value === value && "bg-[var(--app-bg)]",
            )}
          >
            <Badge option={o} />
          </button>
        ))}
      </PortalPanel>
    </>
  );
}

// --- Interrupteur « Publicar » -------------------------------------------------

function PublishToggle({ on, uid, onToggle }: { on: boolean; uid: string; onToggle: (value: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={`${on ? "Publicado" : "No publicado"} — ${uid}`}
      title={on ? "Publicado — visible en las páginas públicas" : "No publicado — solo visible en Admin"}
      onClick={() => onToggle(!on)}
      className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors"
      style={{ backgroundColor: on ? "var(--text)" : "var(--border)" }}
    >
      <span
        className="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform"
        style={{ transform: on ? "translateX(18px)" : "translateX(2px)" }}
      />
    </button>
  );
}

// --- Select personnalisé (dropdown badges colorés, en portail) ----------------

function SelectCell({
  row,
  column,
  onCommit,
}: {
  row: AdminRow;
  column: AdminColumn;
  onCommit: (value: string) => void;
}) {
  const value = (row[column.key] as string) ?? "";
  const options = column.options ?? [];
  const disabled = column.isDisabled?.(row) ?? false;
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  if (disabled) {
    return (
      <span className="block px-3 py-2 text-sm text-[var(--text-muted)]" title="Campo no aplicable">
        —
      </span>
    );
  }

  const pick = (v: string) => {
    onCommit(v);
    setOpen(false);
  };

  return (
    <div className="px-3 py-1.5">
      <button
        ref={ref}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex min-h-[28px] w-full items-center rounded px-1 py-0.5 text-left transition-colors hover:bg-[var(--app-bg)]"
      >
        {current ? (
          <Badge option={current} />
        ) : (
          <span className="text-sm text-[var(--text-muted)]">{column.placeholder ?? "—"}</span>
        )}
      </button>
      <PortalPanel anchorRef={ref} open={open} onClose={() => setOpen(false)} width={224}>
        {!column.required && (
          <button
            type="button"
            role="option"
            aria-selected={value === ""}
            onClick={() => pick("")}
            className="flex w-full items-center rounded px-2 py-1.5 text-left text-sm text-[var(--text-muted)] hover:bg-[var(--app-bg)]"
          >
            — <span className="ml-1 text-xs">(vacío)</span>
          </button>
        )}
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="option"
            aria-selected={o.value === value}
            onClick={() => pick(o.value)}
            className={cn(
              "flex w-full items-center rounded px-2 py-1.5 text-left hover:bg-[var(--app-bg)]",
              o.value === value && "bg-[var(--app-bg)]",
            )}
          >
            <Badge option={o} />
          </button>
        ))}
      </PortalPanel>
    </div>
  );
}

// --- Cellule éditable (text/url/date/time) ------------------------------------

function EditableCell({
  row,
  column,
  onCommit,
}: {
  row: AdminRow;
  column: AdminColumn;
  onCommit: (value: string) => void;
}) {
  const value = (row[column.key] as string) ?? "";
  const type = column.type ?? "text";
  const disabled = column.isDisabled?.(row) ?? false;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (disabled) {
    return (
      <span className="block px-3 py-2 text-sm text-[var(--text-muted)]" title="Campo no aplicable">
        —
      </span>
    );
  }

  if (type === "date" || type === "time" || type === "datetime") {
    const inputType = type === "datetime" ? "datetime-local" : type;
    const inputVal = type === "datetime" ? value.slice(0, 16) : value;
    const shown = type === "datetime" ? value.slice(0, 16).replace("T", " ") : value;
    if (editing) {
      return (
        <input
          autoFocus
          type={inputType}
          defaultValue={inputVal}
          onChange={(e) => onCommit(e.target.value)}
          onBlur={() => setEditing(false)}
          className="block w-full rounded-sm border border-[var(--focus)] bg-[var(--surface)] px-2 py-1.5 text-sm text-[var(--text)] outline-none"
        />
      );
    }
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="block w-full whitespace-nowrap px-3 py-2 text-left text-sm text-[var(--text)] transition-colors hover:bg-[var(--app-bg)]"
      >
        {shown || <span className="text-[var(--text-muted)]">—</span>}
      </button>
    );
  }

  if (editing) {
    return (
      <input
        autoFocus
        type={type === "url" ? "url" : "text"}
        value={draft}
        placeholder={column.placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          else if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        onBlur={() => {
          setEditing(false);
          if (draft !== value) onCommit(draft);
        }}
        className="block w-full rounded-sm border border-[var(--focus)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none"
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      className="block w-full cursor-text px-3 py-2 text-left text-sm text-[var(--text)] transition-colors hover:bg-[var(--app-bg)]"
    >
      {value ? (
        <span className="break-all">{value}</span>
      ) : (
        <span className="text-[var(--text-muted)]">{column.placeholder ?? "—"}</span>
      )}
    </button>
  );
}

// --- Poignée de drag (deux colonnes de points) --------------------------------

function DragHandleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <circle cx="9" cy="6" r="1.5" />
      <circle cx="15" cy="6" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="18" r="1.5" />
      <circle cx="15" cy="18" r="1.5" />
    </svg>
  );
}

// --- Cellule multi-sélection (participantes, entidades) -----------------------

function MultiSelectCell({
  row,
  column,
  onCommit,
}: {
  row: AdminRow;
  column: AdminColumn;
  onCommit: (values: string[]) => void;
}) {
  const selected = (row[column.key] as string[]) ?? [];
  const options = column.options ?? [];
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const labelOf = (v: string) => options.find((o) => o.value === v)?.label ?? v;

  const toggle = (v: string) => {
    onCommit(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  };

  return (
    <div className="px-3 py-1.5">
      <button
        ref={ref}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-[28px] w-full flex-wrap items-center gap-1 rounded px-1 py-0.5 text-left transition-colors hover:bg-[var(--app-bg)]"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selected.length === 0 ? (
          <span className="text-sm text-[var(--text-muted)]">{column.placeholder ?? "—"}</span>
        ) : (
          selected.map((v) => (
            <span key={v} className="rounded bg-[var(--app-bg)] px-1.5 py-0.5 text-xs text-[var(--text)]">
              {labelOf(v)}
            </span>
          ))
        )}
      </button>
      <PortalPanel anchorRef={ref} open={open} onClose={() => setOpen(false)} width={256}>
        {options.length === 0 ? (
          <p className="px-2 py-2 text-xs text-[var(--text-muted)]">Sin opciones.</p>
        ) : (
          options.map((o) => (
            <label
              key={o.value}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-[var(--text)] hover:bg-[var(--app-bg)]"
            >
              <input
                type="checkbox"
                checked={selected.includes(o.value)}
                onChange={() => toggle(o.value)}
                className="h-4 w-4"
                style={{ accentColor: "var(--focus)" }}
              />
              {o.label}
            </label>
          ))
        )}
      </PortalPanel>
    </div>
  );
}
