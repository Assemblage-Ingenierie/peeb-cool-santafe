# Hojas de ruta — sous-lot 12 : gestionnaire de cartes (créer / supprimer)

Premier des deux lots pour l'édition admin des cartes. **Lot 2 = drag-drop** (à venir).

## Décisions validées (utilisateur)
- Toutes les cartes manipulables (défaut incluses).
- « Proyecto global » : colonnes EE / Género / AyS par semestre, création autorisée.
- Drag-drop vertical à composante fixe (Lot 2).

## Base de données — migration 015 (`20260701000015_roadmap_cartas.sql`)
Design **table unique** : extension de `peebcoolsf_roadmap_estado` (pas de nouvelle
table). Colonnes ajoutées :
- `oculta` (bool) — carte par défaut « supprimée » = masquée sur la feuille.
- `fila` (text) — override de phase (sous-projet) / semestre (global).
- `orden` (double precision) — clé de tri dans la colonne (drag-drop, Lot 2).
- `componente` (text) — composante d'une carte **créée**.
- `creada` (bool) — carte ajoutée à la main (`tarea_key` = UID).

Appliquée via MCP `execute_sql` + fichier versionné. Insert testé (ligne jetable
supprimée aussitôt — aucune donnée réelle touchée).

## Server actions (`app/hojas-de-ruta/actions.ts`)
- `roadmapCrearCarta(feuille, componente, fila, nombre, orden) → key` (UID `carta-…`
  via `node:crypto`). Valide composante et fila.
- `roadmapEliminarCarta(feuille, tareaKey, creada)` — créée → DELETE (+ enlaces) ;
  défaut → `oculta=true`.
- `roadmapRestaurarOcultas(feuille)` — dé-masque toutes les cartes de la feuille.

## Snapshot (`lib/snapshot.ts`)
Select + type `SnapshotRoadmapEstado` + mapping étendus aux 5 colonnes.

## Client (`hojas-de-ruta-client.tsx`)
- État : `ocultas` / `creadas` / `posiciones` ; hydratation depuis le snapshot.
- `construirColumnas()` : modèle unifié d'instances par colonne (fila × composante),
  triées par `orden` — combine cartes par défaut (non masquées, position surchargée)
  et cartes créées. Global → aucune carte par défaut.
- `columnasGrid(fila)` partagé entre phases (sous-projet) et semestres (global) :
  3 colonnes + bouton **« + Añadir tarjeta »** (admin) par colonne.
- Carte (admin) : bouton **✕** (haut-gauche) — « Eliminar » (créée) / « Ocultar »
  (défaut) avec confirmation. Bannière **« N tarjeta(s) oculta(s) · Restaurar »**.

## Vérification
- `npm run lint` + `tsc --noEmit` verts.
- DOM (global) : 27 boutons « Añadir tarjeta » (9 semestres × 3), grille sur les 9.
- Insert DB validé (shape + valeurs par défaut) puis nettoyé.

## Lot 2 (à venir)
Drag-drop vertical avec aimantation : réordonner (`orden`) et changer de
phase/semestre (`fila`), composante fixe. Colonnes `fila`/`orden` déjà en place.
