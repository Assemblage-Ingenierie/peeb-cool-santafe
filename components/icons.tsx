import type { ReactNode } from "react";
import type { IconName } from "@/lib/nav";

const PATHS: Record<IconName, ReactNode> = {
  inicio: (
    <>
      <path d="M3 10.5 12 4l9 6.5" />
      <path d="M5.5 9.5V20h13V9.5" />
      <path d="M9.75 20v-5h4.5v5" />
    </>
  ),
  mapa: (
    <>
      <path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4Z" />
      <path d="M9 4v14M15 6v14" />
    </>
  ),
  hojas: (
    <>
      <circle cx="6" cy="6" r="1.8" />
      <circle cx="6" cy="12" r="1.8" />
      <circle cx="6" cy="18" r="1.8" />
      <path d="M6 7.8v2.4M6 13.8v2.4" />
      <path d="M11 6h9M11 12h9M11 18h6" />
    </>
  ),
  calendario: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
    </>
  ),
  capacitaciones: (
    <>
      <path d="m12 4.5 9.5 4.5L12 13.5 2.5 9 12 4.5Z" />
      <path d="M6.5 11v4.3c0 1.3 2.5 2.7 5.5 2.7s5.5-1.4 5.5-2.7V11" />
      <path d="M21.5 9v4.5" />
    </>
  ),
  admin: (
    <>
      <path d="M6 4v5.5M6 14.5V20M12 4v6.5M12 15.5V20M18 4v3.5M18 12.5V20" />
      <circle cx="6" cy="12" r="2.2" />
      <circle cx="12" cy="13" r="2.2" />
      <circle cx="18" cy="10" r="2.2" />
    </>
  ),
  roles: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0" />
      <path d="M16.2 5.4a3.2 3.2 0 0 1 .2 5.4" />
      <path d="M17 19.5a5.5 5.5 0 0 0-2.6-4.7" />
    </>
  ),
};

interface IconProps {
  className?: string;
}

export function NavIcon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}

export function MenuIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function LogoutIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M14 4h3.5A1.5 1.5 0 0 1 19 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14" />
      <path d="M4 12h11M8.5 8 4 12l4.5 4" />
    </svg>
  );
}

export function ClipboardIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="8" y="4" width="11" height="14" rx="2" />
      <path d="M16 4.5V4a2 2 0 0 0-2-2h-3a2 2 0 0 0-2 2v.5" transform="translate(0 0)" />
      <path d="M5.5 8.5A2 2 0 0 0 4 10.4V20a2 2 0 0 0 2 2h7" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 12.5 10 17.5 19 7" />
    </svg>
  );
}

export function TrashIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 7h16M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M6 7l1 12.5A1.5 1.5 0 0 0 8.5 21h7a1.5 1.5 0 0 0 1.5-1.5L18 7" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function SearchIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}
