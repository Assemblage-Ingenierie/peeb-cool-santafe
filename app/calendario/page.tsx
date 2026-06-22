import { CalendarioClient } from "@/components/calendario/calendario-client";

// Calendario (CDC §4.3) — coquille serveur ; tout l'interactif (lecture
// /api/snapshot, navigation, sélecteur de fuseau) vit dans CalendarioClient.
export default function CalendarioPage() {
  return <CalendarioClient />;
}
