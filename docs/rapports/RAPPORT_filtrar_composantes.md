# Filtres « Filtrar » par composante — effet sur les pages + couleur des medidas

## Demandes
1. **Inicio / subproyectos — medidas** : fond de la couleur de la composante (ton clair,
   couleurs des boutons Filtrar) derrière l'en-tête de chaque bloc de medidas.
2. **Boutons Filtrar** : n'afficher que les éléments des composantes actives —
   - Inicio : événements agenda + documentos (global ET subproyectos) ; medidas de la
     composante (subproyectos) ;
   - Hojas de ruta : cartes des composantes actives ;
   - Calendario : événements des composantes actives.

## Lot 1 — couleur des en-têtes de medidas (`medidas-blocks.tsx`)
Chaque groupe (Medidas EE / género / Otras) porte un fond de la couleur de sa
composante (`getComponente(code).color` + `onColor`) derrière son titre ; « Otras »
(sans composante) → neutre.

## Lot 2 — effet du filtre
Contexte partagé (`components/filter-context.tsx`) :
- `FilterProvider` (monté par `AppShell` autour des pages) expose le Set des
  composantes actives ; `useComponentFilters()` le lit ; `pasaFiltro(filtros, comp)`
  = `comp == null || filtros.has(comp)` (les éléments sans composante restent visibles).

Application :
- **Agenda** (`agenda.tsx`) : événements filtrés par composante.
- **Documentos** : `bottom-band.tsx` (subproyectos) + `global-blocks.tsx` (global).
- **Medidas** (`medidas-blocks.tsx`) : groupes filtrés par composante.
- **Hojas de ruta** (`hojas-de-ruta-client.tsx`) : `columnasGrid` ne rend que les
  colonnes des composantes actives ; la grille s'ajuste au nombre visible.
- **Calendario** (`calendario-client.tsx`) : événements filtrés avant `MonthGrid`.

## Vérification (aperçu réel :3000)
- Hojas de ruta : AyS désactivé → colonne AyS masquée, grille 3 → 2 colonnes.
- Agenda : G désactivé → 7 → 5 événements.
- Medidas : G désactivé → « Medidas género » masqué ; réactivé → réapparaît.
- En-têtes medidas : « Medidas EE » `#fff2cc`, « Medidas género » `#d9d2e9`, « Otras » neutre.
- `npm run lint` + `tsc --noEmit` verts. Aucune écriture DB.

## Notes
- Règle « sans composante = toujours visible » appliquée partout (documentos/eventos
  sans composante, « Otras medidas »). Ajustable si tu préfères les masquer en vue filtrée.

## Ajustes (retour utilisateur)
- **En-têtes de medidas** : bar de couleur en **plein-bord** (flush haut/gauche/droite,
  plus de marge blanche) — bloc `overflow-hidden`, en-tête sans arrondi ni marge, liste
  avec padding.
- **Modèle « Vista / Rol »** (renommage de « Filtrar ») :
  - **GP = Todo** : tout visible ; **actif par défaut**. Clic sur GP = réinitialise
    (tout réapparaît). Grisé dès qu'une autre composante est cochée.
  - **EE / AyS / G** : clic → n'affiche que cette (ces) composante(s) — depuis « Todo »,
    un clic passe à la composante seule ; clics suivants ajoutent/retirent ; vide → Todo.
  - Bouton **actif = texte blanc sur fond foncé** (+ pastille de couleur) ; inactif = gris.
  Logique dans `app-shell.tsx` (`toggleFilter`), rendu dans `component-filters.tsx`.
  Les pages sont inchangées (elles lisent le Set de composantes visibles).
