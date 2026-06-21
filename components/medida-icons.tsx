import type { ReactNode } from "react";
import { getMedida, type MedidaCode } from "@/lib/constants";

// ============================================================
// Pictogrammes des mesures (CDC §4.5) — style « trait de couleur sur blanc ».
// Tracés maison (viewBox 24×24, même langage que components/icons.tsx).
// Género / AyS = badge-lettre (G / AyS), pas de picto. La couleur (trait ou
// lettre) vient de MEDIDAS (lib/constants) — surchargée via `color` au besoin.
// Réutilisé par l'éditeur Admin (S3) et le dashboard (S4).
// ============================================================

const PATHS: Partial<Record<MedidaCode, ReactNode>> = {
  // Aislación : isolant en zigzag entre deux faces de mur (le zigzag touche les deux barres).
  aislacion: <path d="M6 4v16M18 4v16M6 5.5L18 8 6 10.5 18 13 6 15.5 18 18" />,
  // Carpinterías : fenêtre à quatre carreaux.
  carpinterias: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="1.5" />
      <path d="M12 4v16M4 12h16" />
    </>
  ),
  // HVAC : unité murale + flux d'air.
  hvac: (
    <>
      <rect x="3" y="5" width="18" height="7" rx="2" />
      <path d="M5.5 9.5h13M7 15c1.2 1 1.2 2.2 0 3.2M12 15c1.2 1 1.2 2.2 0 3.2M17 15c1.2 1 1.2 2.2 0 3.2" />
    </>
  ),
  // Luminarias : ampoule + culot.
  luminarias: (
    <>
      <path d="M12 3a6 6 0 0 0-3.7 10.7c.5.4.7.9.7 1.5v.3h6v-.3c0-.6.2-1.1.7-1.5A6 6 0 0 0 12 3Z" />
      <path d="M9.5 18.5h5M10.5 21h3" />
    </>
  ),
  // Fotovoltaicos : panneau à grille (3×3) sur pied.
  fotovoltaicos: (
    <>
      <rect x="4" y="6" width="16" height="11" rx="1" />
      <path d="M4 9.7h16M4 13.4h16M9.3 6v11M14.6 6v11M8 20h8M12 17v3" />
    </>
  ),
  // Solar térmica : soleil + ondes de chaleur (distinct du panneau PV).
  solar_termica: (
    <>
      <circle cx="12" cy="7" r="3" />
      <path d="M12 1.5v1.3M12 11.2v1.3M5.7 7h1.3M17 7h1.3M7.5 2.5l.9.9M16.5 2.5l-.9.9" />
      <path d="M5 16c1.5-1.6 3-1.6 4.5 0s3 1.6 4.5 0 3-1.6 4.5 0M5 19c1.5-1.6 3-1.6 4.5 0s3 1.6 4.5 0 3-1.6 4.5 0" />
    </>
  ),
  // Otras : bâtiment.
  otras: (
    <>
      <rect x="5" y="4" width="14" height="16" rx="1" />
      <path d="M8.5 8h2M13.5 8h2M8.5 11.5h2M13.5 11.5h2M8.5 15h2M13.5 15h2M11 20v-3h2v3M3.5 20h17" />
    </>
  ),
};

export function MedidaIcon({
  code,
  size = 24,
  color,
  className,
}: {
  code: MedidaCode;
  size?: number;
  color?: string;
  className?: string;
}) {
  const medida = getMedida(code);
  const stroke = color ?? medida?.color ?? "currentColor";

  // Género / AyS : badge-lettre coloré (pas de pictogramme).
  if (medida?.letra) {
    return (
      <span
        className={className}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: size,
          height: size,
          color: stroke,
          fontWeight: 500,
          fontSize: medida.letra.length > 1 ? size * 0.46 : size * 0.82,
          lineHeight: 1,
        }}
        aria-hidden="true"
      >
        {medida.letra}
      </span>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={stroke}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[code]}
    </svg>
  );
}
