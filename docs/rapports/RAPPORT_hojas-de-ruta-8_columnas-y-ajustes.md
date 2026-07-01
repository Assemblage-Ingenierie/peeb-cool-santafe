# Hojas de ruta — sous-lot 8 : colonnes par composante + ajustes cartes

## Demandes
1. En-tête (zone du nom) des cartes **Género** en violet **plus clair**.
2. Retirer le mot « **Comentario** » du bloc commentaire (toutes cartes).
3. Organiser les cartes **en colonnes par composante** : 1ʳᵉ EE, 2ᵉ Género, 3ᵉ AyS.

## Ce qui a été fait

### `lib/constants.ts`
- `CARD_TONOS.G.head` : `#b4a7d6` → **`#d9d2e9`** (violet clair, = couleur composante G).
  `headText` (`#2b1a5e`) et `border` (`#b4a7d6`) inchangés.

### `components/hojas-de-ruta/hojas-de-ruta-client.tsx`
- **Commentaire** : suppression du libellé « Comentario: » ; seul le texte s'affiche.
- **Colonnes** : nouvelle constante `COLUMNAS = ["EE", "G", "AyS"]` (ordre gauche→
  droite). Chaque phase rend une grille `grid-cols-3` ; une colonne par composante,
  **conservée même vide** (les cartes d'une composante restent alignées verticalement
  d'une phase à l'autre). GP à ajouter dans `COLUMNAS` quand son contenu existera.
- Rendu de carte extrait dans `renderCard()` (évite la triple duplication du JSX).
- Carte : `w-[232px]` → `w-full max-w-[264px]` (remplit sa colonne sans déborder).

## Vérification (dev port 3000, DOM SSR)
- `grid-cols-3` sur les 6 phases ; 12 cartes `G` avec en-tête `#d9d2e9`.
- Aucun préfixe « Comentario: ».
- `npm run lint` et `tsc --noEmit` verts.
- Flèches d'enlace : recalcul auto au layout (positions mesurées), OK.
