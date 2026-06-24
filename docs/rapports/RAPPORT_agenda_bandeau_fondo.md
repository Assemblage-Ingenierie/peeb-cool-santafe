# Inicio — bandeau Agenda : fond pleine largeur

**Date :** 2026-06-24
**Demande utilisateur :** fond `#434343` derrière le bandeau Agenda, **pleine largeur** (de la sidebar au bord droit), avec « Agenda » **aligné** sur « Gestión ».

## Changement

- **`components/dashboard/dashboard-client.tsx`** : l'Agenda sort du conteneur `max-w-7xl` commun et est enveloppé dans un bandeau **full-bleed** : `-mx-4 sm:-mx-6` (annule le padding horizontal de `<main>`) + `-mt-6` (ras du header) + `px-4 py-4 sm:px-6` + fond `#434343`. À l'intérieur, un `div mx-auto max-w-7xl` **recentre le contenu** exactement comme le reste du dashboard → « Agenda » aligné avec « Gestión ». Le reste (Gestión, Resumen, etc.) garde son `max-w-7xl`.
- **`components/dashboard/agenda.tsx`** : libellé « Agenda » en **blanc** (`text-white`) pour rester lisible sur le fond foncé (le reste de la section inchangé).

## Vérifications

- `npx tsc --noEmit` ✅ · `npx eslint` (fichiers touchés) ✅
- Mesures DOM (viewport 1600) : `Agenda.left` = `Gestión.left` = 277 (alignés) ; fond du bandeau de x=248 (bord sidebar) à x≈1585 (bord droit) = pleine largeur.

Note : le bandeau est aussi au ras du header (en haut). Couleur/marge ajustables au besoin.
