"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { fmtNumero } from "@/lib/format";
import type { SelectOption } from "./editable-table";
import { NotasEditor } from "./notas-editor";

// ============================================================
// Éditeur « par champ » (≠ tableau-liste) pour les sections
// Datos del edificio / faisabilidad / proyecto (CDC §4.5).
// Types : text | number (NULLABLE → « — », jamais 0) | select (pastilles).
// Aucune couleur en dur : tokens lib/constants.ts (sauf couleurs d'options).
// ============================================================

export type FieldType = "text" | "number" | "select" | "richtext";

export interface FieldDef {
  key: string;
  label: string;
  type?: FieldType; // défaut : text
  options?: SelectOption[]; // select
  placeholder?: string;
  suffix?: string; // unité affichée (kWh, €, %, m²…)
  integer?: boolean; // number entier
  required?: boolean; // select : pas de désélection
}

interface FieldEditorProps {
  fields: FieldDef[];
  values: Record<string, unknown>;
  onCommit: (key: string, value: string) => void;
}

export function FieldEditor({ fields, values, onCommit }: FieldEditorProps) {
  return (
    <dl className="divide-y divide-[var(--border)] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      {fields.map((f) => (
        <div key={f.key} className="grid grid-cols-1 gap-1 px-4 py-2.5 sm:grid-cols-[14rem_1fr] sm:items-center sm:gap-3">
          <dt className="text-sm text-[var(--text-muted)]">
            {f.label}
            {f.suffix ? <span className="ml-1 opacity-70">({f.suffix})</span> : null}
          </dt>
          <dd className="text-sm text-[var(--text)]">
            <FieldValue field={f} value={values[f.key]} onCommit={(v) => onCommit(f.key, v)} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function FieldValue({
  field,
  value,
  onCommit,
}: {
  field: FieldDef;
  value: unknown;
  onCommit: (value: string) => void;
}) {
  if (field.type === "select") {
    return <SelectField field={field} value={(value as string) ?? ""} onCommit={onCommit} />;
  }
  if (field.type === "number") {
    return <NumberField field={field} value={value} onCommit={onCommit} />;
  }
  if (field.type === "richtext") {
    return <NotasEditor value={(value as string) ?? ""} onCommit={onCommit} />;
  }
  return <TextField field={field} value={(value as string) ?? ""} onCommit={onCommit} />;
}

// --- Select en pastilles (peu d'options : tipología…) -------------------------

function SelectField({
  field,
  value,
  onCommit,
}: {
  field: FieldDef;
  value: string;
  onCommit: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {(field.options ?? []).map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onCommit(on && !field.required ? "" : o.value)}
            aria-pressed={on}
            className={cn(
              "rounded px-2 py-0.5 text-xs font-medium transition-colors",
              !on && "border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--app-bg)]",
            )}
            style={on ? { backgroundColor: o.color ?? "var(--text)", color: o.onColor ?? "#fff" } : undefined}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// --- Champ texte (édition inline) ---------------------------------------------

function TextField({
  field,
  value,
  onCommit,
}: {
  field: FieldDef;
  value: string;
  onCommit: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (editing) {
    return (
      <input
        autoFocus
        type="text"
        value={draft}
        placeholder={field.placeholder}
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
        className="block w-full rounded-sm border border-[var(--focus)] bg-[var(--surface)] px-2 py-1 text-sm text-[var(--text)] outline-none"
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
      className="block w-full cursor-text rounded-sm px-2 py-1 text-left text-sm transition-colors hover:bg-[var(--app-bg)]"
    >
      {value ? <span className="break-words">{value}</span> : <span className="text-[var(--text-muted)]">{field.placeholder ?? "—"}</span>}
    </button>
  );
}

// --- Champ numérique nullable (vide = NULL → « — » ; « 0 » = 0) ---------------

function NumberField({
  field,
  value,
  onCommit,
}: {
  field: FieldDef;
  value: unknown;
  onCommit: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const isNull = value === null || value === undefined || value === "";
  const num = isNull ? null : Number(value);
  const raw = num === null || Number.isNaN(num) ? "" : String(num);

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        step={field.integer ? "1" : "any"}
        defaultValue={raw}
        placeholder={field.placeholder ?? "—"}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          else if (e.key === "Escape") {
            (e.currentTarget as HTMLInputElement).value = raw;
            setEditing(false);
          }
        }}
        onBlur={(e) => {
          setEditing(false);
          if (e.target.value !== raw) onCommit(e.target.value);
        }}
        className="block w-full max-w-[16rem] rounded-sm border border-[var(--focus)] bg-[var(--surface)] px-2 py-1 text-sm text-[var(--text)] outline-none"
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="block w-full cursor-text rounded-sm px-2 py-1 text-left text-sm transition-colors hover:bg-[var(--app-bg)]"
    >
      {num === null || Number.isNaN(num) ? (
        <span className="text-[var(--text-muted)]">—</span>
      ) : (
        <span>{fmtNumero(num, 2)}</span>
      )}
    </button>
  );
}
