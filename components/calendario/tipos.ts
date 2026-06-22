// Forme d'entrée d'un événement : formulaire Calendario → Server Actions.
// Module neutre (pas de directive) → importable côté client ET serveur.
export interface EventoInput {
  nombre: string;
  fecha: string; // AAAA-MM-DD
  hora_inicio: string | null; // HH:MM (ou null)
  hora_fin: string | null; // HH:MM (ou null)
  componente: string | null; // GP | EE | AyS | G
  modalidad: string | null; // Presencial | Virtual
  lugar: string | null;
  url_conexion: string | null;
  participantes: string[]; // UID equipo | entidades
  formacion: boolean;
  url_documento: string | null;
}
