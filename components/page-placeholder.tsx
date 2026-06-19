interface PagePlaceholderProps {
  title: string;
  description?: string;
}

/** Coquille de page (Étape 2) : titre + zone « en construcción ». */
export function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  return (
    <section className="mx-auto max-w-5xl">
      <h1 className="text-xl font-semibold tracking-tight text-[var(--text)]">{title}</h1>
      {description && (
        <p className="mt-1 text-sm text-[var(--text-muted)]">{description}</p>
      )}
      <div className="mt-6 flex items-center justify-center rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-16 text-center text-sm text-[var(--text-muted)]">
        Contenido en construcción.
      </div>
    </section>
  );
}
