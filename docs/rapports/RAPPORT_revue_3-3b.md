# Revue de code & base — après 3.3b + ajustes

> **Date :** 2026-06-19 · Revue de consolidation après la restructuration de la gestion de sous-projet et tous les ajustes.

## Build & qualité
- `next build` : **exit 0** (toutes les routes compilent ; `/admin` dynamique, reste statique).
- `tsc --noEmit` + ESLint : **OK**.

## Base de données — intégrité (via MCP)
| Contrôle | Résultat |
|---|---|
| Sous-projets | 9 ✅ |
| Metricas | 18 (9×2) ; 0 sous-projet hors 2 metricas ✅ |
| Gestión — fases | 72 (9×8) ; 0 sous-projet hors 8 fases ✅ |
| Gestión — documentos | 36 (seed intact) ✅ |
| Orphelins (gestion / metricas) | 0 / 0 ✅ |
| Lignes de test résiduelles (subs / equipo / entidades) | 0 / 0 / 0 ✅ |
| Référentiel fases | 8 ✅ |

## Advisors Supabase
- **Sécurité** : aucune alerte sur le schéma `peebcoolsf_`. Les alertes (`function_search_path_mutable`, `authenticated_security_definer_function_executable`, `extension_in_public pg_net`) concernent **l'autre app `peeb_`** du projet partagé ; `auth_leaked_password_protection` est un réglage projet → **Étape 6**. Nos fonctions sont en `peebcoolsf_private` avec `search_path=''`.
- **Performance** (INFO/WARN, non bloquants, sur `peebcoolsf_`) :
  - `unindexed_foreign_keys` sur FK vers tables de référence minuscules (componentes/estados/fases/tipo_linea/tipologias) → **bénéfice nul à cette échelle, non indexé** (choix free-tier).
  - `unused_index` sur `*_componente` → index créés pour le **filtre par composante (Étape 4)**, pas encore requêtés → **conservés**.
  - `multiple_permissive_policies` (SELECT) → motif `sel` + `admin (FOR ALL)` de l'Étape 1 → à reconsidérer en **Étape 6 (RLS productif)**. Nos policies utilisent déjà `(select …)` (pas de `auth_rls_initplan`).

## Nettoyage effectué
- Retrait de la constante **`TIPO_LINEA`** (`lib/constants.ts`) devenue inutilisée (le dropdown Tipo a disparu avec la restructuration ; les valeurs `documento`/`etapa` restent des littéraux en code/DB).
- Aucun autre code mort (greps `gestionColumns/gestionRows`, `FASE_OPTIONS`, etc. : aucune référence orpheline). `isDisabled` conservé (capacité générique de `EditableTable`).

## Documentation
- **CDC** (`CAHIER_DES_CHARGES_FR.md`) mis à jour : §3.1 (UID gestion docs/fases + écoles `SUB-ESC-NNN`), §3.2 (8 fases), §3.3 (subproyectos.notas, eventos.participantes equipo|entidades, metricas libellé factibilidad, gestion_lineas 2 usages + fecha_inicio/fin), §4.4 (publicar documenté ; gestion confidencial = Documentos), §4.5 (refonte : sélecteur, ajout/suppression écoles, 4 sous-sections, Documentos/Fases).
- **Mémoire projet** mise à jour (état 3.3b + ajustes, migrations 005/006/007, publicar documenté).

## Conclusion
Aucune erreur introduite par les modifications. Base cohérente et propre, build vert. Prêt pour l'**Étape 4**.
