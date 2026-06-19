# Clôture — Étape 1 (Schéma DB + RLS + Seed)

> **Date :** 2026-06-18 · **Projet Supabase :** EXTERNAL (`grnkbnldfzdzrgleorra`, eu-west-3, PG 17.6)
> **Statut : ✅ Terminée et déployée.** Prêt pour l'Étape 2 (charte + layout).

---

## État déployé — comptes par table

| Table (`public.peebcoolsf_…`) | Lignes |
|---|--:|
| `componentes` | 4 |
| `tipologias` | 3 |
| `fases` | 5 |
| `estados` | 2 |
| `tipo_linea` | 2 |
| `subproyectos` | **9** |
| `metricas` (9 faisabilidad + 9 proyecto) | **18** |
| `documentacion_gp` | **6** |
| `capacitaciones_documentos` | **9** |
| `gestion_lineas` (4 × 9) | **36** |
| `entidades` · `equipo` · `eventos` · `perfiles` · `gestion_financiera` · `capacitaciones_eventos` | 0 (pas de seed) |

**Objets de schéma :** 16 tables · RLS actif **16/16** · 32 policies (lecture `authenticated`, écriture `admin`) · 7 index · 9 triggers `updated_at` · 2 fonctions (`peebcoolsf_private.is_admin`, `set_updated_at`).
**Advisor sécurité :** 0 alerte sur `peebcoolsf_` (les warnings du projet appartiennent à une autre app `peeb_*` / réglages projet).

---

## Correction coordonnée — SUB-CENTENARIO

| | Latitude | Longitude |
|---|---|---|
| Avant (Wikipedia, lng 3 décimales) | -32.93833 | -60.664 |
| **Après (corrigé)** | **-32.9385417** | **-60.6647429** |

**Source :** OpenStreetMap way [W190050427](https://www.openstreetmap.org/way/190050427) — centroïde du polygone du bâtiment « Hospital Provincial del Centenario, 3101 Justo José de Urquiza, Rosario » (via Nominatim). Aligné avec le fond de carte OSM utilisé à l'Étape 4.

Les autres coordonnées web (SUB-AIR, SUB-ASV, SUB-CULLEN) et les écoles (CDC §5, E407 approximatif) sont validées — détail dans [`SOURCES_coordenadas_web.md`](SOURCES_coordenadas_web.md).

---

## Commits

| Commit | Objet |
|---|---|
| [`e650d69`](https://github.com/mbhoyroo/peeb-cool-santafe/commit/e650d69) | chore: scaffolding initial (Next.js + structure) |
| [`0d3b9c3`](https://github.com/mbhoyroo/peeb-cool-santafe/commit/0d3b9c3) | **feat(db): schéma + seed peebcoolsf_ Étape 1** |

**Repo :** https://github.com/mbhoyroo/peeb-cool-santafe (privé) · branche `main`

---

## Artefacts de l'Étape 1 (dans `supabase/`)
- `migrations/20250618000001_initial_schema.sql` — schéma + fonctions + index + triggers
- `migrations/20250618000002_rls.sql` — RLS + 32 policies
- `seed.sql` — données §5 (idempotent)
- `SCHEMA_peebcoolsf.md` — schéma documenté complet
- `RAPPORT_creation_schema.md` · `RAPPORT_verification_seed.md` · `SOURCES_coordenadas_web.md`
- `scripts/verify_seed.sql` — requêtes de vérification

---

## Reste ouvert (à traiter plus tard, déjà noté)
- **Étape 4 :** endpoint serveur `/api/snapshot` en `service_role` (lecture, jamais exposée au client) — sinon aucune lecture en dev.
- **Étape 3 :** nettoyage applicatif des UID orphelins dans les `text[]` (participantes/entidades) à la suppression d'une personne/entité.
- **Étape 6 :** auth Supabase réelle, 1ᵉʳ admin dans `perfiles`, activer *leaked password protection*.

## Prochaine étape
**Étape 2 — Charte + layout** : sidebar (`#30323e`), header logos (AFD / Santa Fe), placeholders, et centralisation des couleurs/libellés dans `lib/constants.ts` (§2.3 / §2.4 du CDC).
