# Hojas de ruta — sous-lot 9 : contenu EE

## Objectif
Ajouter les tâches de la composante **Eficiencia energética (EE)** dans la feuille
de route (colonne 1), avec en-tête en jaune clair.

## Ce qui a été fait — `lib/constants.ts`
- `CARD_TONOS.EE.head` : `#ffe599` → **`#fff2cc`** (jaune clair, = couleur composante EE).
  `headText` / `body` / `border` inchangés.
- **6 tâches EE** ajoutées à `ROADMAP_TAREAS` :
  - *Estudios preliminares* : Auditoría energética (ACEFE) ; Actualización del modelo
    de simulación (AT) ; Aprobación del criterio PEEB Cool (AT).
  - *Anteproyecto* : Comprobación del indicador PEEB Cool (AT).
  - *Proyecto ejecutivo* : Comprobación del indicador PEEB Cool (AT) ; Revisión de
    especificaciones técnicas de los materiales y equipos relativos a la EE (AT).
- « Comprobación del indicador PEEB Cool » apparaît en Anteproyecto **et** Proyecto
  ejecutivo → clés `id` distinctes (`ee-antep-comprobacion` / `ee-pe-comprobacion`).
- Redacción de pliegos / Licitación / Obra : pas de tâche EE (fourni vide).

## Vérification (dev port 3000, DOM SSR)
- 6 cartes `data-comp="EE"` ; en-têtes `#fff2cc`.
- 5 responsables « AT » EE (Auditoría = ACEFE).
- `npm run lint` et `tsc --noEmit` verts.

## Reste (contenu Hojas de ruta)
- Composante **GP** (Gestión de proyecto) : ajouter les tâches puis `"GP"` dans
  `COLUMNAS` (hojas-de-ruta-client) pour une 4ᵉ colonne.
