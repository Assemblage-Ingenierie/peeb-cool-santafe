# Hojas de ruta — sous-lot 13 : gestionnaire de cartes (drag-drop)

Second et dernier lot de l'édition admin des cartes (Lot 1 = créer/supprimer,
cf. RAPPORT 12).

## Demande
Déplacer les cartes verticalement en drag-drop pour changer l'**ordre** ou la
**phase/semestre**, **composante fixe**, avec **aimantation** sur les emplacements.

## Server action (`app/hojas-de-ruta/actions.ts`)
- `roadmapMoverCarta(feuille, tareaKey, fila, orden)` : upsert de `fila` + `orden`
  uniquement (onConflict). N'écrase pas `realizada`/`comentario`/etc. d'une carte
  existante (vérifié en DB).

## Client (`hojas-de-ruta-client.tsx`)
- État `drag` (carte en cours + composante) / `dropAt` (fila × composante × index).
- Cartes `draggable` en mode admin (sauf cartes-note, mode lien, ou éditeur ouvert).
- `onColumnaDragOver` : drop autorisé **seulement dans la colonne de même composante**
  (composante fixe) ; calcule l'index d'insertion aimanté selon la position du curseur
  (comparaison au milieu de chaque carte) → `dropAt`.
- **Indicateur d'insertion** (fine ligne accent) affiché à l'emplacement cible.
- `onColumnaDrop` : `orden` = milieu des voisins (`(prev+next)/2`), sinon `prev+1` /
  `next-1` / `0`. Ordre fractionnaire (double precision) → pas de renumérotation des
  voisins. Persistance via `roadmapMoverCarta` (fonctionne pour cartes par défaut =
  override de position, et cartes créées).
- Flèches d'enlace : `posiciones`/`creadas`/`ocultas` ajoutés aux dépendances du
  recalcul de l'overlay (la mise en page change).

## Vérification (aperçu réel sur :3000, après purge des serveurs zombies)
- **Créer** (clic réel) → carte rendue + ligne DB, éditeur ouvert.
- **Drag-drop** (événements DnD synthétiques espacés) : indicateur visible pendant
  le survol ; après drop, la carte change d'ordre dans le DOM **et** en DB
  (`orden` 0/1). Composante fixe respectée.
- **Supprimer** (clic ✕ + confirm) → carte retirée + DELETE en DB.
- **Vue sous-projet** : 6 EE / 12 Género / 26 AyS dans les 3 colonnes, 6 phases,
  jalon AFD. **Toutes les cartes de test supprimées** (aucun artefact en DB).
- `npm run lint` + `tsc --noEmit` verts.

## Reste (hors de cette demande)
- Contenu **GP** (ajouter les tâches + `"GP"` dans `COLUMNAS`).
- Étapes 8 (PWA offline) et 9 (Auth/RLS productif).
