# Rapport — Migration 3 rôles + confidentialité (CDC §10)

> **Date :** 2026-06-19 · **Projet :** EXTERNAL (`grnkbnldfzdzrgleorra`) · schéma `peebcoolsf_`
> **Méthode :** `execute_sql` (connecteur MCP), incrémentale, idempotente. Aucune table recréée, aucun re-seed.
> **Statut : ✅ appliquée et vérifiée.** En attente de validation avant la partie B (visuel).

---

## 1. Rôles

| Élément | État |
|---|---|
| Contrainte `peebcoolsf_perfiles.rol` | `CHECK (rol IN ('admin','gestion','consultor'))` ✅ |
| Lignes `perfiles` à migrer | 0 (table vide) — aucune donnée impactée |
| `peebcoolsf_private.current_rol()` | créée ✅ (`SECURITY DEFINER`, `STABLE`, `search_path = ''`) |
| `peebcoolsf_private.is_admin()` | conservée, inchangée ✅ |

`current_rol()` est en schéma **non exposé** → pas de lint advisor (vérifié).

## 2. Champ `confidencial` (boolean, NOT NULL, default `false`)

| Table | `confidencial` |
|---|:--:|
| `peebcoolsf_documentacion_gp` | ✅ |
| `peebcoolsf_gestion_financiera` | ✅ |
| `peebcoolsf_capacitaciones_documentos` | ✅ |
| `peebcoolsf_capacitaciones_eventos` | ✅ |
| `peebcoolsf_gestion_lineas` | ✅ |

Aucune autre table ne porte ce champ (métriques / référentiels / sous-projets / équipe / événements exclus, conforme §4.4).

## 3. Policies de lecture (5 tables documentaires)

Chacune (`*_sel`, `FOR SELECT TO authenticated`) :
```
USING ( (SELECT peebcoolsf_private.current_rol()) IN ('admin','gestion')
        OR confidencial = false )
```
→ `admin`/`gestion` voient tout ; `consultor` (ou utilisateur sans profil) ne voit que `confidencial = false`.
Les policies d'écriture `*_admin` (`FOR ALL USING is_admin()`) sont **inchangées** → écriture = `admin` uniquement.

## 4. Matrice d'accès rôle × table × (Lecture / Écriture)

| Tables | admin | gestion | consultor |
|---|---|---|---|
| **5 tables documentaires** (`documentacion_gp`, `gestion_financiera`, `capacitaciones_documentos`, `capacitaciones_eventos`, `gestion_lineas`) | L : toutes · **É : oui** | L : toutes · É : non | L : `confidencial=false` · É : non |
| **Autres** (`componentes`, `tipologias`, `fases`, `estados`, `tipo_linea`, `entidades`, `subproyectos`, `metricas`, `equipo`, `eventos`) | L : toutes · **É : oui** | L : toutes · É : non | L : toutes · É : non |
| **`perfiles`** | L : toutes · **É : oui** | L : propre ligne · É : non | L : propre ligne · É : non |

> Écriture `gestion` = **non** pour l'instant (périmètre à définir, §10.4). Lecture en dev via `service_role` (bypass RLS) ; le bypass mock admin reste applicatif.

## 5. Index

Pas d'index sur `confidencial` (cardinalité 2 → inutile, §10.5).

## 6. Advisor sécurité

**0 alerte attribuable à `peebcoolsf_`.** Warnings restants hors périmètre (autre app `peeb_*`, extension `pg_net`, *leaked password protection* — à activer Étape 6). Inchangés par cette migration.

---

## Fichiers locaux mis à jour
- `supabase/migrations/20260619000003_roles_confidencial.sql` — migration incrémentale (exact SQL appliqué).
- `001`/`002` conservés tels quels (baseline Étape 1) ; la chaîne `001 → 002 → 003` reproduit l'état déployé actuel.
