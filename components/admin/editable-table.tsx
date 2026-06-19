"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { TrashIcon } from "@/components/icons";
import { CopyButton } from "./copy-button";

// ============================================================
// Composant de tableau éditable réutilisable (style Airtable).
// - Édition inline cellule par cellule (clic → champ, Entrée/blur = valider, Échap = annuler)
// - Colonne « Confidencial » (checkbox rouge) optionnelle (5 tables documentaires §4.4)
// - UID visible + copiable
// - Champ désactivable conditionnellement (ex. URL grisé si tipo_linea ≠ Documento)
// - Ajout / suppression de lignes optionnels
// Aucune couleur en dur : tokens de lib/constants.ts.
// ============================================================

export type AdminColumnType = "text" | "url";

export interface AdminColumn {
  key: string;
  label: string;
  type?: AdminColumnType; // défaut : text
  placeholder?: string;
  /** Grise/désactive le champ pour cette ligne (ex. url si tipo_linea ≠ documento). */
  isDisabled?: (row: AdminRow) => boolean;
}

export interface AdminRow {
  uid: string;
  confidencial?: boolean;
  [key: string]: unknown;
}

interface EditableTableProps {
  columns: AdminColumn[];
  rows: AdminRow[];
  onChange: (rows: AdminRow[]) => void;
  showConfidencial?: boolean;
  onDelete?: (uid: string) => void;
  onAdd?: () => void;
  addLabel?: string;
  emptyLabel?: string;
}

export function EditableTable({
  columns,
  rows,
  onChange,
  showConfidencial = false,
  onDelete,
  onAdd,
  addLabel = "+ Agregar fila",
  emptyLabel = "Sin registros.",
}: EditableTableProps) {
  const updateRow = (updated: AdminRow) =>
    onChange(rows.map((r) => (r.uid === updated.uid ? updated : r)));

  const colCount =
    (showConfidencial ? 1 : 0) + columns.length + 1 + (onDelete ? 1 : 0);

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--app-bg)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              {showConfidencial && (
                <th
                  scope="col"
                  className="w-px px-3 py-2 whitespace-nowrap"
                  title="Confidencial — oculto para el rol Consultor"
                >
                  Conf.
                </th>
              )}
              {columns.map((c) => (
                <th key={c.key} scope="col" className="px-3 py-2">
                  {c.label}
                </th>
              ))}
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
                <td
                  colSpan={colCount}
                  className="px-3 py-10 text-center text-[var(--text-muted)]"
                >
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.uid} className="border-b border-[var(--border)] last:border-b-0">
                  {showConfidencial && (
                    <td className="px-3 py-1.5 align-middle">
                      <input
                        type="checkbox"
                        checked={Boolean(row.confidencial)}
                        onChange={(e) =>
                          updateRow({ ...row, confidencial: e.target.checked })
                        }
                        aria-label={`Confidencial — ${row.uid}`}
                        title="Confidencial (oculto para Consultor)"
                        className="h-4 w-4 cursor-pointer"
                        style={{ accentColor: "var(--accent)" }}
                      />
                    </td>
                  )}

                  {columns.map((col) => {
                    const disabled = col.isDisabled?.(row) ?? false;
                    return (
                      <td key={col.key} className="align-middle">
                        <EditableCell
                          value={(row[col.key] as string) ?? ""}
                          type={col.type ?? "text"}
                          disabled={disabled}
                          placeholder={col.placeholder}
                          onCommit={(v) => updateRow({ ...row, [col.key]: v })}
                        />
                      </td>
                    );
                  })}

                  <td className="px-3 py-1.5 align-middle whitespace-nowrap">
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

// --- Cellule éditable inline ------------------------------------------------

interface EditableCellProps {
  value: string;
  type: AdminColumnType;
  disabled: boolean;
  placeholder?: string;
  onCommit: (value: string) => void;
}

function EditableCell({ value, type, disabled, placeholder, onCommit }: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (disabled) {
    return (
      <span
        className="block px-3 py-2 text-sm text-[var(--text-muted)]"
        title="Campo no aplicable para este tipo de línea"
      >
        —
      </span>
    );
  }

  if (editing) {
    return (
      <input
        autoFocus
        type={type === "url" ? "url" : "text"}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          } else if (e.key === "Escape") {
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
        <span className="text-[var(--text-muted)]">{placeholder ?? "—"}</span>
      )}
    </button>
  );
}
