# Récap — Étape 3.2 : Equipo (+ entidades) & Calendario

> **Date :** 2026-06-19 · Onglets **Equipo** et **Calendario** branchés sur Supabase réel.

## Couche Admin générique (factorisée pour 3.2 / 3.3)
- **`lib/admin/config.ts`** : config par table (nom, préfixe/pad UID, champs éditables, champs date/array/flags, valeurs par défaut, ordre). Aucun secret.
- **`lib/admin/read.ts`** : `listTable(key)` — lecture serveur générique (service_role, sans cache).
- **`app/admin/actions.ts`** : Server Actions **génériques** validées par liste blanche — `addRow`, `updateField`, `setFlag`, `setArrayField`, `deleteRow`. `assertAdmin()` + `revalidatePath` partout. **UID généré serveur** (préfixe + max+1 zéro-paddé, par table).
- `app/admin/page.tsx` lit les 4 tables en parallèle (`Promise.all`).

## `EditableTable` étendu (générique réutilisable)
Nouveaux types de colonne : **select** (avec pastille de couleur), **date**, **time**, **multiselect** (chips + panneau à cases). Conserve : recherche client, édition inline texte/url, Confidencial (checkbox rouge), Publicar (interrupteur neutre), ajout/suppression, UID copiable.

## Onglets livrés
- **Equipo** : personnes (apellido, nombre, **entidad** [select dynamique], rol, **componente** [select pastille], teléfono, mail, **sexo** [F/M/X]). UID `EQ-NNN`.
- **Entidades** (sous la même page) : liste éditable (nombre). UID `ENT-NNN`. *(Suppression bloquée si l'entité est utilisée par une personne — intégrité FK.)*
- **Calendario** : eventos (nombre, **fecha** [date], **inicio/fin** [time], **componente**, **modalidad** [Presencial/Virtual], lugar, enlace, **participantes** [multiselect → equipo]). UID `EVT-NNNN`. `fecha` initialisée à aujourd'hui à la création (NOT NULL).

## CRUD vérifié de bout en bout (contre la base)
| Opération | Résultat |
|---|---|
| Add entidad / persona / evento | `ENT-001`, `EQ-001`, `EVT-0001` (UID serveur, préfixes/pads corrects) ✅ |
| `eventos.fecha` à la création | = aujourd'hui (date NOT NULL) ✅ |
| Multiselect participantes | `EVT-0001.participantes = {EQ-001}` (`setArrayField`, text[]) ✅ |
| Select (modalidad) | `Virtual` (`updateField` générique) ✅ |
| Lecture | 4 tables relues sans cache ✅ |

*(Lignes de test EQ/ENT/EVT supprimées. Les modifications GP faites en test côté utilisateur — `Informe 3`, publicar sur MV/PRESUP — sont conservées : elles ont persisté correctement.)*

## Fichiers
**Nouveaux** : `lib/admin/config.ts`, `lib/admin/read.ts`.
**Modifiés** : `app/admin/actions.ts` (générique), `app/admin/page.tsx` (4 tables), `components/admin/editable-table.tsx` (nouveaux types), `components/admin/admin-tabs.tsx` (Equipo/entidades/Calendario + hook `useAdminTable`).
**Supprimé** : `lib/admin/gp.ts` (remplacé par la couche générique).

## Restant
- **3.3** : Capacitaciones (docs + eventos, 3 sous-sections, confidencial/publicar) + Gestión de subproyectos (datos edificio / faisabilidad / proyecto / gestion_lineas avec `url` grisé si `tipo_linea ≠ documento`, drag&drop `orden`). Nettoyage UID orphelins dans les `text[]` à la suppression d'une personne/entité.
