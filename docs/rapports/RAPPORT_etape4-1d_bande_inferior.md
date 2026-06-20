# Étape 4.1c/4.1d — Zoom Ctrl + bande du bas (Datos / Documentos / Progreso)

> **Date :** 2026-06-19 · Affinages de la capture V2. Lecture seule, aucune migration.

## 4.1c — Carte Inicio : zoom Ctrl + molette (commit `a38dbbf`)
Molette seule = défilement de la page ; **Ctrl + molette = zoom** de la carte. Prop `wheelZoom` (`"ctrl"` par défaut / `"always"` pour la future page Mapa). Vérifié : sans Ctrl z reste 7, avec Ctrl 7 → 13.

## 4.1d — Bande du bas (mode Subproyectos)
La bande du bas devient active en mode **Subproyectos** ; elle reste en placeholders en mode **Proyecto global**.

### Extension du flux de données
- `/api/snapshot` renvoie désormais **`documentos`** (36) en plus de `fases` (72) : une **seule** requête `gestion_lineas` est découpée côté serveur en *fases* (`tipo_linea='etapa'`) et *documents* (**tout le reste — `documento` ou vide**, car 34/36 documents ont `tipo_linea` NULL).

### Composants
- **`datos-card.tsx`** *(réutilisable — resservira pour la card de la page Mapa 4.2)* : consommation avant/après (**kWh et kWh/m²**), **réduction (kWh et %)**, le **% resalté** (gros, accent rouge). Toggle **Factibilidad/Proyecto**.
- **`use-escenario.ts`** : état du toggle. `canToggle` = fase « Proyecto ejecutivo » démarrée (`en_proceso` OU `terminado`) ; défaut = `proyecto` si activable **et** données présentes, sinon `faisabilidad` ; réinitialisé au changement de sélection.
- **`bottom-band.tsx`** :
  - **bâtiment sélectionné** → Datos (sa fiche), Documentos (liens **groupés par composante**, cliquables si URL), Progreso (**fases en vertical**, colorées : `terminado`=vert clair, `en_proceso`=jaune, non démarrée=**foncé**) ;
  - **groupe** (Todos / Aeropuertos / Hospitales / Escuelas) → Datos = **totaux du groupe** (somme kWh ; kWh/m² = Σ kWh ÷ Σ m²) ; Documentos + Progreso **désactivés** (titre seul).
- **`dashboard-client.tsx`** : cliquer un groupe **efface** la sélection d'un bâtiment (et inversement) ; la bande reçoit `mode`/`data`/`tipo`/`selected`.

### Décisions
- **Documentos** : affiche **tous** les documents (en dev, mock admin) ; cliquables si un lien existe (aucun pour l'instant en base). Filtrage `publicar`/`confidencial` → **Étape 6** (auth).
- **Non démarrée** = couleur foncée (token `UI.sidebarBg`). Couleurs estados via `ESTADOS` (constants).
- Toggle de groupe **désactivé** tant que **tous** les bâtiments du groupe n'ont pas démarré le projet (donc partout sur Factibilidad pour l'instant).

## Vérification (serveur de dev, contre la base réelle)
| Contrôle | Résultat |
|---|---|
| `/api/snapshot` → `documentos` | 36 (SUB-AIR : Auditoria/Planos/Proyecto ejecutivo/Pliego) ✅ |
| Bâtiment — Datos | SUB-AIR : 2.476.830 → 1.724.413 kWh ; 289,8 → 201,8 kWh/m² ; **30,4 %** · 752.417 kWh ✅ |
| Bâtiment — toggle Proyecto | **désactivé** (fase non démarrée) ✅ |
| Bâtiment — Documentos | groupe « Sin componente » + 4 docs (gris, sans lien) ✅ |
| Bâtiment — Progreso | 8 fases en vertical, toutes foncées (non démarrées) ✅ |
| Groupe « Todos » — Datos | somme **Antes = 7.964.344 kWh** ; Documentos/Progreso désactivés ✅ |
| Cliquer un groupe efface la sélection | ✅ |
| Mode « Proyecto global » | panneau replié + 3 placeholders « Por definir » ✅ |
| Console | aucune erreur ✅ |

## Suite
**Étape 4.2 — page Mapa** : carte plein écran (zoom libre), clic → **card** réutilisant `DatosCard` (avec le toggle). Reporté : contenu du mode « Proyecto global », câblage des 4 filtres composante.
