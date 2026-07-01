# Hojas de ruta — sous-lot 11 : « Proyecto global » en semestres

## Demandes
- Pour **Proyecto global uniquement** : supprimer les cartes.
- Pour **Proyecto global uniquement** : remplacer la structure par phases par une
  décomposition en **semestres**, de **S2 2026 à S2 2030**.

## Ce qui a été fait — `hojas-de-ruta-client.tsx`
- Nouvelle constante `SEMESTRES` (générée) : S2 2026, S1/S2 2027, S1/S2 2028,
  S1/S2 2029, S1/S2 2030 → **9 semestres**.
- Rendu de la feuille conditionné par `seleccion` :
  - `"global"` → lignes de **semestres** (label à gauche « Semestre / Sx AAAA »,
    zone de contenu vide). Ni phases, ni jalon « No objeción AFD », ni cartes.
  - sous-projet → structure existante inchangée (phases + jalon + colonnes
    EE / Género / AyS + cartes + flèches).

Les composantes/tâches ne sont donc plus affichées pour le global ; elles restent
propres à chaque sous-projet.

## Vérification (dev port 3000, DOM SSR — vue global par défaut)
- 9 labels de semestres (S2 2026 → S2 2030), 9 lignes « Semestre ».
- 0 carte (`data-comp`) et 0 « Fase 0 » en global.
- `npm run lint` et `tsc --noEmit` verts.

## Note / à définir
La zone de droite des lignes de semestre est vide (placeholder). Le contenu à y
placer (jalons projet, livrables par semestre…) reste à préciser.
