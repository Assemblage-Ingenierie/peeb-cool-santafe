import { BibliotecaClient } from "@/components/biblioteca/biblioteca-client";

// Biblioteca — documentos del proyecto (« Documentación de proyecto »), antes en el
// bloque « Documentos » del Inicio. Coquille serveur ; la lecture (/api/snapshot)
// et le rendu vivent dans BibliotecaClient.
export default function BibliotecaPage() {
  return <BibliotecaClient />;
}
