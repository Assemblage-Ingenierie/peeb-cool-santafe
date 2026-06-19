// ============================================================
// Config générique des tables Admin (partagée, AUCUN secret).
// Le serveur (read/actions) l'utilise pour : nom de table, génération d'UID,
// liste blanche des champs éditables, normalisation, ordre.
// ============================================================

export interface TableConfig {
  table: string; // peebcoolsf_...
  uidPrefix: string; // ex. "EQ-", "EVT-", "GP-DOC-"
  uidPad: number; // largeur du numéro zéro-paddé
  textFields: string[]; // champs scalaires éditables (text/url/select/date/time)
  notNull: string[]; // parmi textFields : garder "" au lieu de null
  dateFields: string[]; // champs date NOT NULL → ignorer une valeur vide
  flagFields: string[]; // booléens (confidencial/publicar)
  arrayFields: string[]; // text[] (participantes, entidades)
  select: string; // colonnes PostgREST
  defaults: Record<string, unknown>; // valeurs des nouvelles lignes
  todayField?: string; // champ date à initialiser à aujourd'hui à l'insertion
  orderBy: { col: string; ascending?: boolean; nullsFirst?: boolean }[];
}

export const TABLES: Record<string, TableConfig> = {
  gp: {
    table: "peebcoolsf_documentacion_gp",
    uidPrefix: "GP-DOC-",
    uidPad: 4,
    textFields: ["nombre_documento", "url"],
    notNull: ["nombre_documento"],
    dateFields: [],
    flagFields: ["confidencial", "publicar"],
    arrayFields: [],
    select: "uid, nombre_documento, url, confidencial, publicar, orden",
    defaults: { nombre_documento: "", url: null, confidencial: false, publicar: false },
    orderBy: [
      { col: "orden", ascending: true, nullsFirst: false },
      { col: "uid", ascending: true },
    ],
  },

  entidades: {
    table: "peebcoolsf_entidades",
    uidPrefix: "ENT-",
    uidPad: 3,
    textFields: ["nombre"],
    notNull: ["nombre"],
    dateFields: [],
    flagFields: [],
    arrayFields: [],
    select: "uid, nombre",
    defaults: { nombre: "" },
    orderBy: [{ col: "uid", ascending: true }],
  },

  equipo: {
    table: "peebcoolsf_equipo",
    uidPrefix: "EQ-",
    uidPad: 3,
    textFields: ["apellido", "nombre", "entidad_uid", "rol", "componente", "telefono", "mail", "sexo"],
    notNull: ["apellido", "nombre"],
    dateFields: [],
    flagFields: [],
    arrayFields: [],
    select: "uid, apellido, nombre, entidad_uid, rol, componente, telefono, mail, sexo",
    defaults: { apellido: "", nombre: "" },
    orderBy: [
      { col: "apellido", ascending: true },
      { col: "uid", ascending: true },
    ],
  },

  eventos: {
    table: "peebcoolsf_eventos",
    uidPrefix: "EVT-",
    uidPad: 4,
    textFields: ["nombre", "fecha", "hora_inicio", "hora_fin", "componente", "modalidad", "lugar", "url_conexion"],
    notNull: ["nombre", "fecha"],
    dateFields: ["fecha"],
    flagFields: [],
    arrayFields: ["participantes"],
    select:
      "uid, nombre, fecha, hora_inicio, hora_fin, participantes, componente, modalidad, lugar, url_conexion",
    defaults: { nombre: "", participantes: [] },
    todayField: "fecha",
    orderBy: [
      { col: "fecha", ascending: true },
      { col: "uid", ascending: true },
    ],
  },
};

export type TableKey = keyof typeof TABLES;
