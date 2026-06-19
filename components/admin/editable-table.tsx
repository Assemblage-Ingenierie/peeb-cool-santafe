"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { TrashIcon, SearchIcon } from "@/components/icons";
import { CopyButton } from "./copy-button";

// ============================================================
// Tableau éditable réutilisable (style Airtable).
// Types de colonne : text | url | select | date | time | multiselect.
// - Recherche/filtre client (UID + colonnes texte) — aucune requête DB
// - Édition inline ; callbacks granulaires → Server Actions par le parent
// - Confidencial (checkbox ROUGE = accès/RLS) et Publicar (interrupteur neutre
//   = affichage) restent deux axes indépendants, visuellement distincts.
// Aucune couleur en dur : tokens de lib/constants.ts.
// ============================================================

export type AdminColumnType = "text" | "url" | "select" | "date" | "time" | "multiselect";

export interface SelectOption {
  value: string;
  label: string;
  color?: string;
}

export interface AdminColumn {
  key: string;
  label: string;
  type?: AdminColumnType; // défaut : text
  placeholder?: string;
  options?: SelectOption[]; // select / multiselect
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
  addLabel?: string;
  emptyLabel?: string;
  searchPlaceholder?: string;
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
  addLabel = "+ Agregar fila",
  emptyLabel = "Sin registros.",
  searchPlaceholder = "Buscar…",
}: EditableTableProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      if (row.uid.toLowerCase().includes(q)) return true;
      return columns.some((c) => {
        const v = row[c.key];
        return typeof v === "string" && v.toLowerCase().includes(q);
      });
    });
  }, [rows, columns, query]);

  const colCount =
    (showConfidencial ? 1 : 0) + columns.length + (showPublicar ? 1 : 0) + 1 + (onDelete ? 1 : 0);

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] p-2">
        <div className="relative max-w-xs">
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
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--app-bg)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
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
                  Sin resultados para « {query} ».
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.uid} className="border-b border-[var(--border)] last:border-b-0">
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
                        <MultiSelectCell
                          row={row}
                          column={col}
                          onCommit={(vals) => onMultiCommit?.(row.uid, col.key, vals)}
                        />
                      </td>
                    ) : (
                      <td key={col.key} className="align-middle">
                        <EditableCell
                          row={row}
                          column={col}
                          onCommit={(v) => onCellCommit?.(row.uid, col.key, v)}
                        />
                      </td>
                    ),
                  )}

                  {showPublicar && (
                    <td className="px-3 py-1.5 align-middle">
                      <PublishToggle
                        on={Boolean(row.publicar)}
                        uid={row.uid}
                        onToggle={(v) => onToggleFlag?.(row.uid, "publicar", v)}
                      />
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

// --- Pastille de couleur (select componente, etc.) ----------------------------

function Pastille({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: color, outline: "1px solid var(--border)" }}
      aria-hidden="true"
    />
  );
}

// --- Cellule éditable (text/url/select/date/time) -----------------------------

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

  // SELECT
  if (type === "select") {
    const options = column.options ?? [];
    const current = options.find((o) => o.value === value);
    if (editing) {
      return (
        <select
          autoFocus
          value={value}
          onChange={(e) => {
            onCommit(e.target.value);
            setEditing(false);
          }}
          onBlur={() => setEditing(false)}
          className="block w-full rounded-sm border border-[var(--focus)] bg-[var(--surface)] px-2 py-1.5 text-sm text-[var(--text)] outline-none"
        >
          <option value="">—</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    }
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-sm text-[var(--text)] transition-colors hover:bg-[var(--app-bg)]"
      >
        {current ? (
          <>
            {current.color && <Pastille color={current.color} />}
            <span>{current.label}</span>
          </>
        ) : (
          <span className="text-[var(--text-muted)]">{column.placeholder ?? "—"}</span>
        )}
      </button>
    );
  }

  // DATE / TIME — commit on change
  if (type === "date" || type === "time") {
    if (editing) {
      return (
        <input
          autoFocus
          type={type}
          defaultValue={value}
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
        className="block w-full px-3 py-2 text-left text-sm text-[var(--text)] transition-colors hover:bg-[var(--app-bg)]"
      >
        {value || <span className="text-[var(--text-muted)]">—</span>}
      </button>
    );
  }

  // TEXT / URL — draft + commit on blur/Enter
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
  const [open, setOpen] = useState(false);
  const labelOf = (v: string) => options.find((o) => o.value === v)?.label ?? v;

  const toggle = (v: string) => {
    onCommit(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  };

  return (
    <div className="relative px-3 py-1.5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-[28px] w-full flex-wrap items-center gap-1 rounded px-1 py-0.5 text-left text-sm transition-colors hover:bg-[var(--app-bg)]"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selected.length === 0 ? (
          <span className="text-[var(--text-muted)]">{column.placeholder ?? "—"}</span>
        ) : (
          selected.map((v) => (
            <span
              key={v}
              className="rounded bg-[var(--app-bg)] px-1.5 py-0.5 text-xs text-[var(--text)]"
            >
              {labelOf(v)}
            </span>
          ))
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div
            role="listbox"
            aria-multiselectable="true"
            className="absolute left-2 z-20 mt-1 max-h-60 w-64 overflow-auto rounded-md border border-[var(--border)] bg-[var(--surface)] p-1 shadow-lg"
          >
            {options.length === 0 ? (
              <p className="px-2 py-2 text-xs text-[var(--text-muted)]">Sin opciones.</p>
            ) : (
              options.map((o) => {
                const on = selected.includes(o.value);
                return (
                  <label
                    key={o.value}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-[var(--text)] hover:bg-[var(--app-bg)]"
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(o.value)}
                      className="h-4 w-4"
                      style={{ accentColor: "var(--focus)" }}
                    />
                    {o.label}
                  </label>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
