"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";
import { getCurrentUser, isAdmin, rolLabel } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { LogoSlot } from "./logo-slot";
import { NavIcon, LogoutIcon } from "./icons";

interface SidebarProps {
  mobileOpen: boolean;
  onNavigate: () => void; // ferme le tiroir mobile au clic d'un lien
}

export function Sidebar({ mobileOpen, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const user = getCurrentUser();
  const admin = isAdmin(user);
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || admin);

  return (
    <aside
      id="sidebar"
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col bg-[var(--sidebar-bg)] text-[var(--sidebar-text)] transition-transform duration-200 ease-out",
        "lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-full lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
      )}
    >
      {/* Logo Assemblage — même hauteur (72px) que le header pour aligner tous les logos */}
      <div className="flex h-[72px] shrink-0 items-center border-b border-[var(--sidebar-border)] px-5">
        <LogoSlot
          src="/logos/assemblage.png"
          file="assemblage.png"
          alt="Assemblage ingeniería"
          className="h-11 w-auto"
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2" aria-label="Navegación principal">
        <ul className="space-y-1">
          {items.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-[var(--sidebar-active)] font-semibold text-[var(--sidebar-text)]"
                      : "font-medium text-[var(--sidebar-text-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-text)]",
                  )}
                >
                  {active && (
                    <span
                      className="absolute inset-y-1 left-0 w-[3px] rounded-full bg-[var(--accent)]"
                      aria-hidden="true"
                    />
                  )}
                  <NavIcon
                    name={item.icon}
                    className={cn("h-5 w-5 shrink-0", active && "text-[var(--accent)]")}
                  />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bas : filigrane « .A » (décoratif) + pied utilisateur */}
      <div className="relative">
        <LogoSlot
          src="/logos/assemblage-a.png"
          file="assemblage-a.png"
          alt=""
          className="pointer-events-none absolute -bottom-2 right-3 h-20 w-auto opacity-[0.06] select-none"
        />

        {user && (
          <div className="relative border-t border-[var(--sidebar-border)] px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--sidebar-text)]">
                  {user.nombre}
                </p>
                <p className="truncate text-xs text-[var(--sidebar-text-muted)]">
                  {rolLabel(user.rol)}
                </p>
              </div>
              <button
                type="button"
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--sidebar-text-muted)] transition-colors hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-text)]"
              >
                <LogoutIcon className="h-[18px] w-[18px]" />
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
