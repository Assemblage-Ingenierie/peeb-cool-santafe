# Rapport — Migration `publicar` (CDC §4.4 / §10)

> **Date :** 2026-06-19 · **Projet :** EXTERNAL (`grnkbnldfzdzrgleorra`) · schéma `peebcoolsf_`
> **Méthode :** `execute_sql` (MCP), incrémentale, idempotente. Aucune table recréée.
> **Statut : ✅ appliquée et vérifiée.**

## Changement
Champ **`publicar boolean NOT NULL DEFAULT false`** ajouté sur les 5 tables documentaires (les mêmes que `confidencial`).

| Table | `publicar` |
|---|:--:|
| `peebcoolsf_documentacion_gp` | ✅ |
| `peebcoolsf_gestion_financiera` | ✅ |
| `peebcoolsf_capacitaciones_documentos` | ✅ |
| `peebcoolsf_capacitaciones_eventos` | ✅ |
| `peebcoolsf_gestion_lineas` | ✅ |

## Deux axes indépendants (ne pas confondre)
| | `confidencial` (migration 003) | `publicar` (migration 004) |
|---|---|---|
| Nature | **Accès** (sécurité) | **Affichage / workflow** |
| Mécanisme | **RLS** : Consultor exclu si `true` | **Aucune RLS** ; filtrage à l'affichage public (Étape 4) |
| Visible en Admin | toujours (admin/gestion) | **toujours** (l'Admin est le classeur de travail) |
| Effet | qui voit la ligne | si la ligne paraît sur les pages publiques |
| Défaut | `false` | `false` (rien publié sans validation) |

## Vérifications
- 5 colonnes `publicar` présentes (boolean, NOT NULL, default false). ✅
- **Aucune policy RLS modifiée** (confirmé). ✅
- Advisor sécurité : inchangé, 0 alerte `peebcoolsf_`.

## Fichier local
- `supabase/migrations/20260619000004_publicar.sql`
