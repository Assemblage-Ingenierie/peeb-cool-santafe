import { REQUISITOS_AYS, refMgas, getComponente } from "@/lib/constants";

// ============================================================
// Bloc « Ambiental y social » (mode Subproyectos, bâtiment sélectionné).
// Remplace l'ancien groupe « Especificidades AyS ». Contenu : texte libre
// (ays_texto) puis la liste des requisitos AyS cochés, groupés par section MGAS.
// ============================================================

export function AysBlock({ texto, checked }: { texto: string | null; checked: Set<string> }) {
  const grupos = REQUISITOS_AYS.map((g) => ({
    grupo: g,
    items: g.requisitos.filter((r) => checked.has(r.code)),
  })).filter((x) => x.items.length > 0);

  const vacio = !texto && grupos.length === 0;
  const c = getComponente("AyS");

  return (
    <section className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <h2
        className="px-4 py-2 text-sm font-semibold text-[var(--text)]"
        style={c ? { backgroundColor: c.color, color: c.onColor } : { backgroundColor: "var(--app-bg)" }}
      >
        Ambiental y social
      </h2>

      <div className="px-4 pb-4 pt-3">
        {vacio ? (
          <p className="text-sm text-[var(--text-muted)]">Sin información.</p>
        ) : (
          <>
            {texto ? (
              <p className="whitespace-pre-line text-sm text-[var(--text-muted)]">{texto}</p>
            ) : null}

            {grupos.map(({ grupo, items }) => (
              <div key={grupo.code} className="mt-3 first:mt-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  {grupo.titulo}{" "}
                  <span className="font-normal normal-case opacity-70">({refMgas(grupo.code)})</span>
                </p>
                <ul className="mt-1.5 space-y-1">
                  {items.map((r) => (
                    <li key={r.code} className="flex items-start gap-2 text-sm text-[var(--text)]">
                      <span
                        aria-hidden="true"
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--text-muted)]"
                      />
                      <span>
                        {r.label}{" "}
                        <span className="text-xs text-[var(--text-muted)]">({refMgas(r.code)})</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </>
        )}
      </div>
    </section>
  );
}
