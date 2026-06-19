import { LogoSlot } from "./logo-slot";
import { MenuIcon } from "./icons";
import { ComponentFilters } from "./component-filters";

interface HeaderProps {
  onMenu: () => void;
  filters: Set<string>;
  onToggleFilter: (code: string) => void;
}

export function Header({ onMenu, filters, onToggleFilter }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2.5">
      {/* Menu mobile */}
      <button
        type="button"
        onClick={onMenu}
        aria-label="Abrir menú"
        aria-controls="sidebar"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-[var(--app-bg)] lg:hidden"
      >
        <MenuIcon className="h-5 w-5" />
      </button>

      {/* Logos institutionnels (gauche) */}
      <div className="flex items-center gap-3">
        <LogoSlot
          src="/logos/afd.png"
          file="afd.png"
          alt="AFD — Agence Française de Développement"
          className="h-8 w-auto sm:h-9"
        />
        <span className="h-7 w-px bg-[var(--border)]" aria-hidden="true" />
        <LogoSlot
          src="/logos/santafe.png"
          file="santafe.png"
          alt="Provincia de Santa Fe"
          className="h-6 w-auto sm:h-7"
        />
      </div>

      {/* Filtres par composante (droite) */}
      <div className="ml-auto">
        <ComponentFilters selected={filters} onToggle={onToggleFilter} />
      </div>
    </header>
  );
}
