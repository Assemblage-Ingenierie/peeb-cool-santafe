# Correctif — tech debt ESLint (dashboard) : `npm run lint` au vert

**Date :** 2026-06-22
**Contexte :** `npm run lint` échouait à cause de problèmes préexistants (antérieurs à la page Calendario) dans 3 fichiers du dashboard. Aucun rapport avec le Calendario ; corrigé séparément.

## Corrections

1. **`use-escenario.ts`** — ERREUR `react-hooks/set-state-in-effect` : `setEsc(...)` appelé dans un `useEffect`. Remplacé par le pattern React **« ajuster l'état pendant le rendu »** (comparaison d'un état `contexto` mémorisant `{canToggle, proyectoHasData, resetKey}` ; au changement → `setEsc(défaut)`). Plus d'effet, et bonus : suppression du flash `faisabilidad → proyecto` au montage (l'init paresseux part déjà sur le bon défaut). **Comportement préservé** : défaut = `proyecto` si `canToggle && proyectoHasData`, sinon `faisabilidad` ; réinitialisation quand le contexte change ; `select` ne s'applique que si `canToggle`.

2. **`bottom-band.tsx`** :
   - Import `cn` inutilisé → retiré.
   - Warning `react-hooks/exhaustive-deps` sur `scopeSubs` (dépendance instable du `useMemo` `totales`) → calcul `totales` extrait dans un **helper au niveau module** `computeTotales(scopeSubs, escenario, metBySub)` (pattern recommandé, comme `scrollToTarget` dans `agenda.tsx`). Plus de `useMemo` manuel → plus de dépendance instable, le React Compiler mémoïse l'appel. (`useMemo` reste utilisé pour `subs`/`metBySub`/`fasesBySub`/`docsBySub`/`medidasBySub`.)

3. **`global-blocks.tsx`** — import de type `SnapshotDocProyecto` inutilisé → retiré.

## Vérifications

- `npx eslint components/dashboard` → propre.
- **`npm run lint` (global) → vert.**
- `npx tsc --noEmit` → OK.
- Navigateur (serveur géré) : Inicio mode Subproyectos, sélection d'un bâtiment → la card **Datos** rend correctement (toggle Factibilidad/Proyecto, consommations, réduction) ; **aucune erreur console** (pas de boucle de rendu introduite par le pattern « ajuster pendant le rendu »).

## Note React Compiler

Le projet a le React Compiler activé : la mémoïsation manuelle (`useCallback`/`useMemo`) peut déclencher `preserve-manual-memoization`. Préférer des **helpers stables au niveau module** (pures, hors composant) et laisser le compilateur mémoïser, plutôt que d'ajouter des `useMemo` pour satisfaire `exhaustive-deps`.
