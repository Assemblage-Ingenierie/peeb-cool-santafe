# Rapport — Vérification du seed §5 (Supabase EXTERNAL)

> **Date :** 2026-06-18
> **Projet :** EXTERNAL (`grnkbnldfzdzrgleorra`) — schéma `peebcoolsf_`
> **Méthode :** seed par lots idempotents (`on conflict do nothing`) via `execute_sql`.
> **Statut :** Seed chargé et vérifié. **En attente de validation.** Mise à jour des fichiers SQL locaux + commit à faire **après** validation.

---

## Comptes par table (attendu vs réel)

| Table | Attendu | Réel | OK |
|---|---|---|---|
| `peebcoolsf_componentes` | 4 | 4 | ✅ |
| `peebcoolsf_tipologias` | 3 | 3 | ✅ |
| `peebcoolsf_fases` | 5 | 5 | ✅ |
| `peebcoolsf_estados` | 2 | 2 | ✅ |
| `peebcoolsf_tipo_linea` | 2 | 2 | ✅ |
| `peebcoolsf_subproyectos` | 9 | 9 | ✅ |
| `peebcoolsf_metricas` (total) | 18 | 18 | ✅ |
| — dont `faisabilidad` | 9 | 9 | ✅ |
| — dont `proyecto` (vides) | 9 | 9 | ✅ |
| `peebcoolsf_documentacion_gp` | 6 | 6 | ✅ |
| `peebcoolsf_capacitaciones_documentos` | 9 | 9 | ✅ |
| `peebcoolsf_gestion_lineas` | 36 | 36 | ✅ |
| `peebcoolsf_entidades` | 0 | 0 | ✅ (pas de seed) |
| `peebcoolsf_equipo` | 0 | 0 | ✅ (pas de seed) |
| `peebcoolsf_eventos` | 0 | 0 | ✅ (pas de seed) |

---

## Les 9 sous-projets (avec métriques de faisabilité)

> `economía %` est **calculée à l'affichage** (non stockée) : `(demanda_antes − demanda_despues) / demanda_antes`.

| # | UID | Nom | Typ. | Surf. m² | Dem. avant (kWh) | Dem. après (kWh) | Écon. % | Coût autres € | Benef. personal | Benef. usuarios | Benef. indirectos |
|---|---|---|:--:|--:|--:|--:|--:|--:|--:|--:|--:|
| 1 | `SUB-AIR` | Aeropuerto Internacional de Rosario (Malvinas) | A | 8547 | 2 476 830 | 1 724 413 | 30.4 | **—** | 268 | 2 461 208 | 4 870 000 |
| 2 | `SUB-ASV` | Aeropuerto de Sauce Viejo | A | 3276 | 1 022 879 | 736 942 | 28.0 | 0 | 824 400 | 315 556 | 687 000 |
| 3 | `SUB-CENTENARIO` | Hospital del Centenario de Rosario | H | 3962 | 2 347 919 | 1 532 271 | 34.7 | 1 188 600 | 1 984 | 412 018 | 1 348 452 |
| 4 | `SUB-CULLEN` | Hospital J. M. Cullen de Santa Fe | H | 1295 | 984 776 | 628 667 | 36.2 | 388 500 | 2 195 | 197 224 | 568 259 |
| 5 | `SUB-E67` | Escuela 67 Pestalozzi | E | 1479.76 | 143 300 | 41 877 | 70.8 | 295 952 | 157 | 10 017 | 30 523 |
| 6 | `SUB-E407` | Escuela 407 Flores (Pocho Lepratti) | E | 2150 | 161 981 | 65 231 | 59.7 | 430 000 | **—** | **—** | **—** |
| 7 | `SUB-E574` | Escuela 574 Pérez (Juan Carlos) | E | 2713 | 230 225 | 76 588 | 66.7 | 542 600 | **—** | **—** | **—** |
| 8 | `SUB-E1109` | Escuela 1109 Yrigoyen | E | 2558.15 | 202 836 | 80 275 | 60.4 | 511 630 | 413 | 4 749 | 15 484 |
| 9 | `SUB-E331` | Escuela 331 Brown | E | 5089.19 | 393 598 | 159 699 | 59.4 | 1 017 838 | **—** | 25 251 | 75 754 |

---

## Contrôle des NULL (jamais 0)

| Règle CDC §5 | État | OK |
|---|---|---|
| `SUB-AIR.costo_otras_eur` = NULL (manquant) | `null` | ✅ |
| `SUB-ASV.costo_otras_eur` = 0 (valeur réelle) | `0` | ✅ |
| `SUB-E407` bénéficiaires = NULL | tous `null` | ✅ |
| `SUB-E574` bénéficiaires = NULL | tous `null` | ✅ |
| `SUB-E1109` % femmes = NULL (compteurs présents) | `pct_muj null`, compteurs 413/4749/15484 | ✅ |
| `SUB-E331` personal = NULL, % femmes = NULL | `personal null`, usuarios 25251, indirectos 75754, pct null | ✅ |
| `metricas proyecto` = lignes vides (numériques NULL) | 9 lignes, numériques `null` | ✅ |

---

## Coordonnées géographiques

| Source | Sous-projets | Note |
|---|---|---|
| CDC §5 (onglet ESC) | E67, E574, E1109, E331 | exactes |
| CDC §5 (déduite adresse) | E407 | **approximatives** (5 de Agosto y España) |
| Recherche web | SUB-AIR (-32.90361, -60.78444), SUB-ASV (-31.71104, -60.81138), SUB-CENTENARIO (-32.93833, -60.66400), SUB-CULLEN (-31.64850, -60.71891) | aéroports + hôpitaux |

---

## Reste à faire (après validation)

1. Mettre à jour les fichiers SQL locaux du repo (`supabase/migrations/*.sql`, `supabase/seed.sql`) en version préfixée `peebcoolsf_` reflétant le déploiement réel.
2. Commit dédié (« feat(db): schéma + seed peebcoolsf_ Étape 1 ») + push.
3. Étape 2 — charte + layout.
