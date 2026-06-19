import type { AdminRow } from "./editable-table";

// Données de DÉMONSTRATION (locales) pour valider l'ergonomie de l'Étape 3.1.
// Reflètent le seed réel de documentacion_gp. La persistance réelle (lecture/écriture
// Supabase en service_role) sera branchée une fois SUPABASE_SERVICE_ROLE_KEY configurée.
export const DEMO_DOCUMENTACION_GP: AdminRow[] = [
  { uid: "GP-DOC-MANUAL", nombre_documento: "Manual Operativo", url: "", confidencial: false },
  { uid: "GP-DOC-PAC", nombre_documento: "Plan de adquisiciones", url: "", confidencial: false },
  { uid: "GP-DOC-MV", nombre_documento: "Plan de M&V", url: "", confidencial: false },
  { uid: "GP-DOC-PRESUP", nombre_documento: "Presupuesto", url: "", confidencial: false },
  { uid: "GP-DOC-INI", nombre_documento: "Informe de inicio", url: "", confidencial: false },
  { uid: "GP-DOC-PER1", nombre_documento: "Informe periódico 1", url: "", confidencial: false },
];
