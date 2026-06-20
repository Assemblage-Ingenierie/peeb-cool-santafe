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
  orderField?: string; // colonne d'ordre réécrite par le drag & drop (ex. "orden")
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

  capdoc: {
    table: "peebcoolsf_capacitaciones_documentos",
    uidPrefix: "CAP-DOC-",
    uidPad: 4,
    textFields: ["subseccion", "componente", "titulo", "url"],
    notNull: ["subseccion", "titulo"],
    dateFields: [],
    flagFields: ["confidencial", "publicar"],
    arrayFields: [],
    select: "uid, subseccion, componente, titulo, url, confidencial, publicar, orden",
    defaults: { subseccion: "EE", titulo: "", confidencial: false, publicar: false },
    orderBy: [
      { col: "subseccion", ascending: true },
      { col: "orden", ascending: true, nullsFirst: false },
      { col: "uid", ascending: true },
    ],
  },

  capevt: {
    table: "peebcoolsf_capacitaciones_eventos",
    uidPrefix: "CAPEVT-",
    uidPad: 4,
    textFields: ["subseccion", "componente", "fecha_hora", "documento_uid"],
    notNull: ["subseccion"],
    dateFields: [],
    flagFields: ["confidencial", "publicar"],
    arrayFields: ["entidades", "participantes"],
    select:
      "uid, subseccion, componente, entidades, participantes, fecha_hora, documento_uid, confidencial, publicar",
    defaults: { subseccion: "EE", entidades: [], participantes: [], confidencial: false, publicar: false },
    orderBy: [
      { col: "subseccion", ascending: true },
      { col: "uid", ascending: true },
    ],
  },

  // Gestion de sous-projet (style Airtable). UID per-subproyecto (GEST-<code>-NNNN) :
  // généré par l'action dédiée addGestionLinea, pas par addRow générique.
  // `fecha` est une date NULLABLE (≠ eventos) → hors dateFields : vide ⇒ NULL.
  gestion: {
    table: "peebcoolsf_gestion_lineas",
    uidPrefix: "GEST-",
    uidPad: 4,
    textFields: ["titulo", "tipo_linea", "componente", "url", "estado", "fecha", "fecha_inicio", "fecha_fin", "fase"],
    notNull: ["titulo"],
    dateFields: [],
    flagFields: ["confidencial", "publicar"],
    arrayFields: [],
    select:
      "uid, subproyecto_uid, titulo, orden, tipo_linea, componente, url, estado, fecha, fecha_inicio, fecha_fin, fase, confidencial, publicar",
    defaults: { titulo: "", confidencial: false, publicar: false, orden: 0 },
    orderField: "orden",
    orderBy: [
      { col: "orden", ascending: true },
      { col: "uid", ascending: true },
    ],
  },
};

export type TableKey = keyof typeof TABLES;
