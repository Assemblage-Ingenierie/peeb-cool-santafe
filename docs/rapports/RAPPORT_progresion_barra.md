# Tableau Resumen — Progresión : barre continue (au lieu des cases pleines)

**Date :** 2026-06-22
**Demande utilisateur :** les cases pleines vert/jaune de la colonne Progresión faisaient « lourd ». Proposition plus sympa, même principe (une marque par phase) et même code couleur. Après comparatif de 3 styles (points / segments / barre continue), l'utilisateur a choisi la **barre continue** (option C).

## Changement (`components/dashboard/global-table.tsx`)

- Les 7 `<td>` remplis par fase sont remplacés par **un seul `<td colSpan={7}>`** contenant une **barre de progression continue segmentée** (un segment par fase, extrémités arrondies `rounded-full`, fines séparations blanches via `gap`).
- Couleurs **inchangées** : `terminado` = vert `#b6d7a8`, `en_proceso` = jaune `#ffd966`. Les phases **`sin iniciar`** passent du blanc vide à un **rail gris clair** (`COL_TRACK = #e6e8ec`) → la ligne se lit toujours comme une jauge de 7 étapes.
- En-têtes de colonnes (EP/AP/PE/PL/NO/LI/OB) et légende **conservés** ; tooltip par segment (`fase : estado`) conservé.

## Vérifications

- `tsc` + `eslint components/dashboard/global-table.tsx` OK.
- Navigateur (serveur géré) : barre rendue sur les 9 sous-projets, segments aux bonnes couleurs (EP vert, AP jaune pour les aéroports, reste gris), conteneur en pilule (extrémités arrondies), aucune erreur console.
