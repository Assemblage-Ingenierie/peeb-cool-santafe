# Hojas de ruta — sous-lot 7 : contenu Género

## Objectif
Ajouter les tâches de la composante **Género (G)** dans la feuille de route, via le
mécanisme générique prévu (une seule source de tâches dans `lib/constants.ts`).

## Ce qui a été fait

### `lib/constants.ts`
- `ROADMAP_AYS` → **`ROADMAP_TAREAS`** (le tableau porte désormais toutes les
  composantes, plus seulement AyS).
- `RoadmapTarea` étendue de trois champs optionnels :
  - `id?` — clé de persistance stable (défaut = `nombre`). **Obligatoire** quand
    deux tâches partagent le même `nombre`, sinon collision de l'état en base
    (cas « Revisión de proyecto con perspectiva de género » présente en
    Anteproyecto **et** Proyecto ejecutivo).
  - `responsable?` — défaut = `RESPONSABLE_DEFECTO` (« ACEFE »).
  - `comentario?` — commentaire par défaut affiché sur la carte.
- **12 tâches Género** ajoutées (fases Estudios preliminares → Licitación).
  Responsable « ACEFE » par défaut ; « AT » quand précisé (6 tâches).
  Références d'impact en commentaire (Impacto 1, 3, 4, 5, 9, 9.3, 9.4, 9.5, 10).
  Orthographe espagnole normalisée (accents).

### `components/hojas-de-ruta/hojas-de-ruta-client.tsx`
- Import `ROADMAP_AYS` → `ROADMAP_TAREAS`.
- `CardModel` : champs `responsable?` / `comentario?`.
- `cardsDeFase` : `key = t.id ?? t.nombre` ; propage `responsable` / `comentario`.
- `TareaCard` :
  - responsable = `edicion?.responsable ?? card.responsable ?? RESPONSABLE_DEFECTO`.
  - commentaire affiché = note admin persistée **si présente**, sinon défaut de la
    carte (`comentarioEff`). L'éditeur admin reste lié à la note persistée (une
    saisie admin remplace le défaut à l'affichage).

Aucune migration : `peebcoolsf_roadmap_estado.tarea_key` est du texte libre sans FK.

## Vérification (dev port 3000, DOM SSR)
- 12 cartes `data-comp="G"`.
- 6 responsables « AT ».
- 9 commentaires Impacto rendus par défaut.
- `npm run lint` et `tsc --noEmit` verts.

## En attente
- **Obra** (Género) : aucune tâche fournie (message interrompu) — à compléter.
- Composantes **EE** et **GP** : même mécanisme (ajouter les tâches dans
  `ROADMAP_TAREAS`).
