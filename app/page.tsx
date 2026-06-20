import { DashboardClient } from "@/components/dashboard/dashboard-client";

// Inicio (Dashboard) — CDC §4.1. Coquille serveur ; tout l'interactif
// (lecture /api/snapshot, Agenda, Gestión, sélection) vit dans DashboardClient.
export default function InicioPage() {
  return <DashboardClient />;
}
