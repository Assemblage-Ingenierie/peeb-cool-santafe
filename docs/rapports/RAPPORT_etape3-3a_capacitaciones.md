# Récap — Étape 3.3a : Capacitaciones

> **Date :** 2026-06-19 · Onglet **Capacitaciones** (documentos + eventos) branché sur Supabase réel.

## Livré
Onglet à deux sections, 3 sous-sections (EE / AyS / G), via la couche générique :
- **Documentos** (`capacitaciones_documentos`) : subsección (select **requis**, badge couleur), componente (badge), título, enlace (URL), **Confidencial + Publicar**. UID nouvelles lignes `CAP-DOC-NNNN`.
- **Eventos** (`capacitaciones_eventos`) : subsección (requis), componente, **documento** (select → un document existant), **fecha y hora** (datetime), **entidades** (multi), **participantes** (multi), **Confidencial + Publicar**. UID `CAPEVT-NNNN`.
- **Filtres** par subsección et componente sur les deux tables.

## Nouveautés du composant (réutilisables)
- Type de colonne **`datetime`** (input `datetime-local`, stocké en timestamptz).
- Drapeau **`required`** sur un select (pas d'option « vide ») — utilisé pour subsección (NOT NULL + CHECK EE/AyS/G).
- Badges colorés pour subsección (couleurs des composantes EE/AyS/G).

## Vérifié de bout en bout (base réelle)
| | Preuve |
|---|---|
| Lecture | 9 documents du seed (CAP-EE/AyS/G-01..03) ✅ |
| Add evento | `CAPEVT-0001` (subsección=EE par défaut, arrays vides) ✅ |
| Datetime | `fecha_hora = 2026-07-01 10:30:00+00` ✅ |
| Select documento (FK) | `documento_uid = CAP-EE-01` → « Formación 1 » ✅ |

*(Ligne de test CAPEVT-0001 supprimée → base propre : 9 documents, 0 evento.)*

## UID — convention
Les nouveaux UID sont par table (`CAP-DOC-NNNN`, `CAPEVT-NNNN`) et **cohabitent** avec les UID parlants du seed (`CAP-EE-01`…). Unicité garantie par la contrainte.

## Refinement noté (non bloquant)
`documento_uid` propose **tous** les documents (label « Subsección — Título »). Le CDC souhaite « un document de la même sous-section » : le filtrage par ligne des options de select n'est pas encore implémenté (les options sont au niveau colonne). À affiner si besoin.

## Restant — 3.3b
- **Gestión de subproyectos** : sections par sous-projet (datos del edificio, faisabilidad, proyecto, gestion_lineas avec `url` grisé si `tipo_linea ≠ documento`, drag & drop `orden`).
- **Nettoyage des UID orphelins** dans les `text[]` (participantes/entidades) à la suppression d'une persona/entidad + `equipo.entidad_uid` mis à NULL.
