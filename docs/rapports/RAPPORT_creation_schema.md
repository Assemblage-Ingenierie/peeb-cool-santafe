# Rapport — Création du schéma `peebcoolsf_` (Supabase EXTERNAL)

> **Date :** 2026-06-18
> **Projet :** EXTERNAL (`grnkbnldfzdzrgleorra`, eu-west-3, PG 17.6) — org *Assemblage Ingenierie*
> **Méthode :** `execute_sql` via connecteur MCP Supabase (jamais `apply_migration`).
> **Statut :** Schéma + RLS créés. **Seed §5 PAS encore chargé** (pause demandée).

---

## Récapitulatif

| Élément | Attendu | Créé | OK |
|---|---|---|---|
| Tables `peebcoolsf_` | 16 | 16 | ✅ |
| Tables avec RLS actif | 16 | 16 | ✅ |
| Policies | 32 | 32 | ✅ |
| Index personnalisés | 7 | 7 | ✅ |
| Triggers `updated_at` | 9 | 9 | ✅ |
| Fonctions (`peebcoolsf_private`) | 2 | 2 | ✅ |

---

## Liste des tables créées (RLS + policies par table)

| Table | RLS actif | Policy lecture (`_sel`) | Policy écriture (`_admin`) |
|---|:---:|:---:|:---:|
| `peebcoolsf_componentes` | ✅ | ✅ authenticated | ✅ admin |
| `peebcoolsf_tipologias` | ✅ | ✅ authenticated | ✅ admin |
| `peebcoolsf_fases` | ✅ | ✅ authenticated | ✅ admin |
| `peebcoolsf_estados` | ✅ | ✅ authenticated | ✅ admin |
| `peebcoolsf_tipo_linea` | ✅ | ✅ authenticated | ✅ admin |
| `peebcoolsf_perfiles` | ✅ | ✅ propre ligne OU admin | ✅ admin |
| `peebcoolsf_entidades` | ✅ | ✅ authenticated | ✅ admin |
| `peebcoolsf_subproyectos` | ✅ | ✅ authenticated | ✅ admin |
| `peebcoolsf_metricas` | ✅ | ✅ authenticated | ✅ admin |
| `peebcoolsf_equipo` | ✅ | ✅ authenticated | ✅ admin |
| `peebcoolsf_eventos` | ✅ | ✅ authenticated | ✅ admin |
| `peebcoolsf_documentacion_gp` | ✅ | ✅ authenticated | ✅ admin |
| `peebcoolsf_gestion_financiera` | ✅ | ✅ authenticated | ✅ admin |
| `peebcoolsf_capacitaciones_documentos` | ✅ | ✅ authenticated | ✅ admin |
| `peebcoolsf_capacitaciones_eventos` | ✅ | ✅ authenticated | ✅ admin |
| `peebcoolsf_gestion_lineas` | ✅ | ✅ authenticated | ✅ admin |

**RLS actif partout : 16/16.** Modèle : lecture = `authenticated`, écriture = `admin` (via `peebcoolsf_private.is_admin()`).

---

## Index créés (7)

- `idx_peebcoolsf_gestion_lineas_subproyecto` — `gestion_lineas(subproyecto_uid)`
- `idx_peebcoolsf_gestion_lineas_componente` — `gestion_lineas(componente)`
- `idx_peebcoolsf_eventos_fecha` — `eventos(fecha)`
- `idx_peebcoolsf_eventos_componente` — `eventos(componente)`
- `idx_peebcoolsf_capevt_documento` — `capacitaciones_eventos(documento_uid)`
- `idx_peebcoolsf_equipo_entidad` — `equipo(entidad_uid)`
- `idx_peebcoolsf_equipo_componente` — `equipo(componente)`

*(`subproyecto_uid` + `escenario` couverts par la contrainte `unique` composite de `metricas`.)*

---

## Fonctions (schéma privé non exposé `peebcoolsf_private`)

- `peebcoolsf_private.is_admin()` — `SECURITY DEFINER`, `STABLE`, `search_path = ''`
- `peebcoolsf_private.set_updated_at()` — trigger `updated_at`, `search_path = ''`

---

## Advisor sécurité Supabase

**Aucun avertissement attribuable au schéma `peebcoolsf_`.** ✅
Le choix de placer `is_admin()` dans un schéma **non exposé** + `search_path=''` évite les lints `function_search_path_mutable` et `authenticated_security_definer_function_executable`.

Avertissements remontés mais **hors périmètre** (appartiennent à une **autre app** déjà présente dans le projet EXTERNAL, ou réglage projet) — **non modifiés** :

| Lint | Objet | Périmètre |
|---|---|---|
| `function_search_path_mutable` | `public.peeb_html_escape`, `public.peeb_email_row`, `public.peeb_email_shell` | autre app (`peeb_*`) |
| `authenticated_security_definer_function_executable` | `public.peeb_can_edit`, `public.peeb_is_admin`, `public.peeb_is_approved` | autre app (`peeb_*`) |
| `extension_in_public` | extension `pg_net` | projet (préexistant) |
| `auth_leaked_password_protection` | Auth (HaveIBeenPwned désactivé) | projet — à activer à l'Étape 6 (auth réelle) |

---

## Reste à faire (après ton feu vert)

1. **Seed §5** (9 sous-projets, métriques faisabilité avec NULL respectés, métriques projet vides, doc GP, capacitaciones, 36 lignes de gestion) via `execute_sql`.
2. Vérification du seed (liste sous-projets + métriques + UID).
3. Mise à jour des fichiers SQL locaux du repo (actuellement en version non préfixée de l'Étape 1) pour refléter le schéma `peebcoolsf_` réellement déployé.
