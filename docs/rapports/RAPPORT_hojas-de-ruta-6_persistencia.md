# RAPPORT — Hojas de ruta, sous-lot 6 : persistance en base

Date : 2026-06-25
Branche : main

## Objectif
Persister l'état d'édition admin de la feuille de route (jusqu'ici local) :
realizada, comentario, overrides texte/responsable, case ANO AFD, et dépendances.

## Modifications
- **DB (migration 014 — `20260625000014_roadmap_estado.sql`)**, créée via MCP
  (`execute_sql`, dev, idempotent) :
  - `peebcoolsf_roadmap_estado` (PK `feuille, tarea_key`) : `realizada`, `comentario`,
    `nombre`, `descripcion`, `responsable`. `feuille` = 'global' | uid sous-projet ;
    `tarea_key` = clé de carte (ou `__ano_afd__` pour la case ANO AFD).
  - `peebcoolsf_roadmap_enlace` (PK `feuille, desde, hacia`) : dépendances (flèches).
  - RLS active : `select` authenticated, écriture admin (`peebcoolsf_private.is_admin()`),
    motif identique aux autres tables. Lecture publique réelle = via `/api/snapshot`.
- **Snapshot (`lib/snapshot.ts`)** : lecture des 2 tables → `roadmapEstado` +
  `roadmapEnlace` dans le snapshot (types + requêtes + retour).
- **Server actions (`app/hojas-de-ruta/actions.ts`)** : `roadmapSetRealizada`,
  `roadmapSetComentario`, `roadmapSetEdicion`, `roadmapSetAnoAfd`, `roadmapAddEnlace`,
  `roadmapRemoveEnlace` — `assertAdmin` + `createServiceClient` + upsert/delete.
- **Client (`hojas-de-ruta-client.tsx`)** :
  - **Hydratation** : à la 1ʳᵉ disponibilité du snapshot, charge l'état persisté dans
    les états locaux (ajuster l'état pendant le rendu, une fois).
  - **Write-through** : realizada / ANO / enlace (ajout-suppr) écrits immédiatement ;
    comentario / edición en **sauvegarde différée** (debounce 600 ms, évite une
    écriture par frappe). L'UI reste optimiste (état local).

## Vérifications
- Tables : RLS active, 2 policies chacune (vérifié via `pg_class`/`pg_policy`).
- Boucle DB → snapshot : témoin inséré via MCP (estado + enlace) → remonte correctement
  dans `/api/snapshot` (fetch cache-busté) → témoins supprimés (0/0).
- `npm run lint` : vert. `npm run build` : OK (toutes les routes compilent).
- Écriture UI → action → DB : même pattern que `setAysRequisito` (en prod) ; compilé
  et câblé. À confirmer d'un clic dans le navigateur (serveur dev du client occupé).

## Notes / limites
- Snapshot mis en cache ~60 s (s-maxage CDN). En session, l'UI optimiste montre les
  changements immédiatement ; après un rechargement, la propagation peut prendre
  jusqu'à 60 s en prod (comportement commun à toute l'app). Pour vérifier une écriture :
  fetch cache-busté.
- `feuille` sans FK ('global' n'est pas un sous-projet) ; `tarea_key` sans FK (les
  tâches vivent dans `lib/constants`).

## Suite (option)
- Déplacer une carte entre fases (le « mover » intra-fase a été retiré à la demande).
- Bouton « última actualización » / rafraîchissement manuel si besoin.
