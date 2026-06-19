# Récap — Ajustes 3.3b (retours utilisateur)

> **Date :** 2026-06-19 · Suite du sous-lot 3.3b, 4 demandes utilisateur.

## Changements

| # | Demande | Nature | Détail |
|---|---|---|---|
| 1 | Retirer le champ **N.º** des nouvelles écoles | UI + action | Formulaire « Agregar escuela » réduit à *Nombre*. UID désormais **auto** `SUB-ESC-NNN` (param `numero` retiré de `addSchool`). |
| 2 | Remplacer **« faisabilidad » → « factibilidad »** | UI (affichage) | Titre « Datos de la **factibilidad** » + texte d'aide. Le mot ne figure plus à l'écran. **Valeur technique `escenario='faisabilidad'` conservée** (clé d'enum invisible ; migration B *non retenue* par l'utilisateur → CDC §3.3 inchangé). |
| 3 | « Costo otras » → **« Costo otras medidas »** | UI (libellé) | Champ `costo_otras_eur`, label seul modifié. |
| 4 | Ajouter fases **Anteproyecto** et **Redacción de pliegos** | **Migration DB** | Voir ci-dessous. |

## Migration DB (005) — fases
`gestion_lineas.fase` étant une **FK vers `peebcoolsf_fases`**, ajouter une fase passe par le référentiel (sinon le select casse à la sélection). Diff proposé puis validé avant exécution.

Ordre chronologique obtenu (`orden`) :
1. Estudios preliminares · 2. **Anteproyecto** · 3. Proyecto ejecutivo · 4. **Redacción de pliegos** · 5. Licitación · 6. Obra · 7. General

- SQL : `supabase/migrations/20260619000005_fases_anteproyecto_redaccion.sql` (exécuté via `execute_sql`, idempotent).
- `lib/constants.ts` : `FASES` mis au même ordre.

## Vérifié (base réelle, école de test puis nettoyée)
| Test | Preuve |
|---|---|
| UID auto | `addSchool` → `SUB-ESC-001` (sans n°) ✅ |
| Libellés | « Datos de la factibilidad », « Costo otras medidas » ; **0 occurrence visible de « faisabilidad »** ✅ |
| Dropdown Fase | 7 fases dans l'ordre chronologique ✅ |
| FK nouvelle fase | sélection « Anteproyecto » → `gestion_lineas.fase='anteproyecto'` persiste ✅ |

`tsc --noEmit` + ESLint : OK.

## ⚠️ Point en attente
Pendant les tests, un clic « + Agregar línea » a visé par erreur le **vrai** SUB-AIR (timing de sélection du harnais de test) → ligne **vide** `GEST-AIR-0005` (titulo `""`). Sa suppression a été **bloquée par le garde-fou de sécurité** (donnée sur un sous-projet réel). À supprimer avec l'accord de l'utilisateur (UI Admin ou SQL) pour restaurer SUB-AIR à ses 4 lignes d'origine.
