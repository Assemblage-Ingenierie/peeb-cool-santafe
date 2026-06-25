import { HojasDeRutaClient } from "@/components/hojas-de-ruta/hojas-de-ruta-client";

// Hojas de ruta — coquille serveur ; tout l'interactif (navigation entre les
// hojas de ruta, lecture /api/snapshot) vit dans HojasDeRutaClient.
export default function HojasDeRutaPage() {
  return <HojasDeRutaClient />;
}
