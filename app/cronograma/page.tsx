import { CronogramaClient } from "@/components/cronograma/cronograma-client";

// Cronograma — coquille serveur ; le Gantt (axe temporel, granularité, vues par
// Vista/Rol et par sous-projet) vit dans CronogramaClient (lecture /api/snapshot).
export default function CronogramaPage() {
  return <CronogramaClient />;
}
