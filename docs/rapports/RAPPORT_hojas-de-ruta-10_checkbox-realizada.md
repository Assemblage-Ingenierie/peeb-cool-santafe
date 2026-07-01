# Hojas de ruta — sous-lot 10 : case « realizada » (forme + couleur par composante)

## Demandes
- Fond de la case cochée **par composante** : Género = violet foncé, EE = jaune foncé.
- **Forme carrée** pour toutes les cases.

## Ce qui a été fait — `hojas-de-ruta-client.tsx`
- Case « realizada » : `rounded-full h-[18px] w-7` (pilule) → **`rounded h-5 w-5`** (carré),
  aligné sur la case « No objeción AFD ».
- Fond coché : `COLOR_REALIZADA` (vert unique) → **`tono.foot`** (couleur foncée de la
  composante) :
  - EE → `#bf9000` (jaune foncé)
  - Género → `#674ea7` (violet foncé)
  - AyS → `#38761d` (vert foncé — sa propre teinte de pied)
  - GP → `#1f1f1f`
- Coche blanche conservée (lisible sur tous les fonds foncés).

## `lib/constants.ts`
- Suppression de `COLOR_REALIZADA` (devenu inutile ; import retiré côté client).

## Vérification (dev port 3000, DOM SSR)
- Plus aucune case ronde (seul `rounded-full` restant = boutons de navigation).
- `npm run lint` et `tsc --noEmit` verts.

## Note
AyS passe du vert `#1b5e20` à `#38761d` (sa teinte de pied) pour rester cohérent avec
la logique « couleur de la composante ». Reste vert ; me le dire si un autre vert est
préféré.
