import type { SnapshotSubproyecto } from "@/lib/snapshot";

// ============================================================
// lib/subproyectos-hipoteticos.ts — Sous-projets FACTICES (hypothétiques).
// Pool de fausses écoles pour tester le comportement de l'app quand la liste
// de sous-projets s'allonge. NE SONT PAS en base : injectés côté client,
// SÉLECTIVEMENT, dans quelques surfaces seulement (tableau général de Inicio,
// cartes interactives, boutons désactivés des sélecteurs). À remplacer par de
// vraies écoles plus tard. Trivialement supprimables (retirer ce fichier +
// les merges qui l'importent).
//
// Une école par département de la Provincia de Santa Fe SAUF Rosario et La
// Capital (« Capital de Santa Fe »). Point ≈ centre de chaque département.
// AUCUN indicateur numérique (pas de metricas) → « — » partout.
// ============================================================

interface DeptSeed {
  dept: string; // nom du département (→ nombre « Escuela - <dept> »)
  code: string; // suffixe d'UID (SUB-HIP-<code>)
  lat: number;
  lng: number;
}

// Centroïdes approximatifs des 17 départements (hors Rosario & La Capital).
const DEPTS: DeptSeed[] = [
  { dept: "Belgrano", code: "BELGRANO", lat: -32.48, lng: -61.65 },
  { dept: "Caseros", code: "CASEROS", lat: -33.3, lng: -61.3 },
  { dept: "Castellanos", code: "CASTELLANOS", lat: -31.35, lng: -61.85 },
  { dept: "Constitución", code: "CONSTITUCION", lat: -33.45, lng: -60.65 },
  { dept: "Garay", code: "GARAY", lat: -31.05, lng: -60.1 },
  { dept: "General López", code: "GENERAL-LOPEZ", lat: -33.95, lng: -61.9 },
  { dept: "General Obligado", code: "GENERAL-OBLIGADO", lat: -29.1, lng: -59.55 },
  { dept: "Iriondo", code: "IRIONDO", lat: -32.7, lng: -61.25 },
  { dept: "Las Colonias", code: "LAS-COLONIAS", lat: -31.4, lng: -61.1 },
  { dept: "Nueve de Julio", code: "NUEVE-DE-JULIO", lat: -29.55, lng: -61.85 },
  { dept: "San Cristóbal", code: "SAN-CRISTOBAL", lat: -30.4, lng: -61.55 },
  { dept: "San Javier", code: "SAN-JAVIER", lat: -30.45, lng: -59.9 },
  { dept: "San Jerónimo", code: "SAN-JERONIMO", lat: -32.1, lng: -60.95 },
  { dept: "San Justo", code: "SAN-JUSTO", lat: -30.7, lng: -60.65 },
  { dept: "San Lorenzo", code: "SAN-LORENZO", lat: -32.85, lng: -60.95 },
  { dept: "San Martín", code: "SAN-MARTIN", lat: -32.0, lng: -61.7 },
  { dept: "Vera", code: "VERA", lat: -29.45, lng: -60.3 },
];

// `orden` élevé (101+) → si un tri par `orden` intervient, les factices passent
// après les sous-projets réels.
export const SUBPROYECTOS_HIPOTETICOS: SnapshotSubproyecto[] = DEPTS.map((d, i) => ({
  uid: `SUB-HIP-${d.code}`,
  nombre: `Escuela - ${d.dept}`,
  tipologia: "E",
  seccion: "Escuelas",
  orden: 101 + i,
  direccion: null,
  lat: d.lat,
  lng: d.lng,
  superficie_m2: null,
  notas: null,
  ays_texto: null,
  hipotetico: true,
}));
