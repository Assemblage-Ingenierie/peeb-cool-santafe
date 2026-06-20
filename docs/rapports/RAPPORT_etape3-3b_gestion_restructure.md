# Récap — Restructuration « Gestión del subproyecto » (Documentos / Fases)

> **Date :** 2026-06-19 · La section est scindée en **2 sous-sections** distinctes.

## Changements (retours utilisateur)
1. **Documentos** : tableau libre (style Airtable) — colonnes `Título · Componente · Enlace (URL) · Estado · Fecha` + Conf./Publicar + drag&drop + « + Agregar documento ». **Colonnes `Tipo` et `Fase` supprimées** (plus de dropdown) ; `url` toujours active.
2. **Fases** : liste **fixe pré-remplie**, 1 ligne par fase (lecture seule = le nom de la fase). Champs : `Estado` + `Fecha inicio` + `Fecha fin`. Pas d'ajout/suppression/drag/UID/confidencial.
3. Nouvelle fase **« No objeción AFD »** entre *Redacción de pliegos* et *Licitación* → **8 fases** chronologiques.

## Modèle de données (réutilise `gestion_lineas`, CDC §3.3)
- **Fases** = lignes `tipo_linea='etapa'`, `fase=<code>`, `titulo=<nom>`, `orden=<1..8>`, UID **stable** `GEST-<code_sub>-<code_fase>`.
- **Documentos** = toutes les autres lignes (`tipo_linea ≠ 'etapa'`). Nouveaux documents : `tipo_linea='documento'`, UID `GEST-<code_sub>-NNNN` (numérotation propre aux documents).
- Les 36 lignes existantes (Auditoria / Planos pdf / Proyecto ejecutivo / Pliego) sont devenues des **Documentos** sans modification.

## Migration DB (007)
`supabase/migrations/20260619000007_gestion_fases_subseccion.sql` (exécutée via `execute_sql`, idempotente) :
- Colonnes `fecha_inicio` / `fecha_fin` (date) sur `gestion_lineas`.
- Fase `no_objecion_afd` (orden 5) + réordonnancement (licitacion→6, obra→7, general→8).
- 1 ligne de fase par (sous-projet × fase) : `cross join` → **80 lignes** (10 sous-projets × 8 fases) au moment de la migration.
- `lib/constants.ts` : `FASES` (8, dans l'ordre) ; `lib/admin/config.ts` : `gestion` lit/écrit `fecha_inicio`/`fecha_fin`.

## Code
- `addSchool` : crée aussi les 8 lignes de fase et les **retourne** (affichage optimiste immédiat).
- `addGestionLinea` : crée un **document** (`tipo_linea='documento'`), orden/numéro calculés sur les documents seuls.
- `EditableTable` : 2 ajouts réutilisables — colonne **`readOnly`** (affiche la valeur) + **`hideUid`**.
- `SubproyectosPanel` : 2 tableaux (Documentos filtré `≠ etapa` + drag&drop préservant les fases ; Fases filtré `= etapa`, triées par orden).

## Vérifié de bout en bout (base réelle, école de test nettoyée)
| Test | Preuve |
|---|---|
| Migration | 8 fases (dont « No objeción AFD » en 5) ; **80 lignes etapa** créées ✅ |
| Structure | Documentos (sans Tipo/Fase) + Fases (Fase RO / Estado / Fecha inicio / Fecha fin, sans UID) ✅ |
| `addSchool` | nouvelle école → **8 fases** pré-remplies + retournées ✅ |
| Édition fase | `estudios_preliminares` → `estado=en_proceso`, `fecha_inicio=2026-01-15`, `fecha_fin=2026-03-20` persistés ✅ |
| Ajout document | `GEST-ESC-001-0001`, `tipo_linea='documento'`, orden 1 (≠ fases) ✅ |
| Données réelles | 9 sous-projets, **36 documents intacts**, 72 fases (9×8) ✅ |

`tsc --noEmit` + ESLint : OK.
