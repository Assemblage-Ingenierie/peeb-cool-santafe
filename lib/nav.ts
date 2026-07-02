// Configuration de la navigation latérale (libellés en espagnol).
// Les pages restent des coquilles vides à l'Étape 2.

export type IconName =
  | "inicio"
  | "mapa"
  | "hojas"
  | "cronograma"
  | "calendario"
  | "capacitaciones"
  | "admin"
  | "roles";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  adminOnly: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/",                label: "Inicio",            icon: "inicio",         adminOnly: false },
  { href: "/mapa",            label: "Mapa",              icon: "mapa",           adminOnly: false },
  { href: "/hojas-de-ruta",   label: "Hojas de ruta",     icon: "hojas",          adminOnly: false },
  { href: "/cronograma",      label: "Cronograma",        icon: "cronograma",     adminOnly: false },
  { href: "/calendario",      label: "Calendario",        icon: "calendario",     adminOnly: false },
  { href: "/capacitaciones",  label: "Capacitaciones",    icon: "capacitaciones", adminOnly: false },
  { href: "/admin",           label: "Admin",             icon: "admin",          adminOnly: true  },
  { href: "/roles",           label: "Gestión de roles",  icon: "roles",          adminOnly: true  },
];
