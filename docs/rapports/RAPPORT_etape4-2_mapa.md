# Étape 4.2 — Page Mapa (carte + card au clic)

> **Date :** 2026-06-19 · Dernier sous-lot du cœur de l'Étape 4. Lecture seule, aucune migration.

## Objectif (CDC §4.2)
Carte **OpenStreetMap plein écran**, marqueurs aux coordonnées de chaque sous-projet (**couleur = typologie**), **clic sur un point → card** : consommations théoriques avant/après (**kWh et kWh/m²**), réduction (**kWh et %**), le **% mis en valeur (resalté)**.

## Livré (réutilisation maximale du Dashboard)
- **`components/dashboard/subproyectos-map.tsx`** (étendu) : nouvelles props `heightClass` (carte plein écran), `wheelZoom="always"` (zoom libre), `renderPopup` (fiche au clic via `<Popup>` Leaflet) ; `onSelect` rendu optionnel. La carte reste **la même** que celle d'Inicio.
- **`components/mapa/mapa-client.tsx`** (nouveau) : récupère `/api/snapshot` (`useSnapshot`), affiche la carte plein écran, et pour chaque point une **card** `MarkerCard` → réutilise **`DatosCard`** + **`useEscenarioToggle`** (mêmes composants que la bande du bas). Toggle **Factibilidad/Proyecto** désactivé tant que la fase « Proyecto ejecutivo » du sous-projet n'est pas démarrée.
- **`app/mapa/page.tsx`** : coquille serveur → `MapaClient`.

Aucun nouveau composant de données : la fiche du Mapa = la fiche de la bande du bas (`DatosCard`).

## Choix techniques
- **Popup Leaflet** ancrée au point (interprétation littérale « au clic sur un point → card »), + infobulle (nom) au survol, + anneau de sélection sur le point ouvert.
- `SubproyectosMap` chargé en import dynamique `ssr:false` (Leaflet ⇒ `window`), comme sur Inicio.
- Hauteur `h-[calc(100vh-11rem)] min-h-[440px]`.

## Vérification (serveur de dev, contre la base réelle)
| Contrôle | Résultat |
|---|---|
| `/mapa` — carte plein écran | 557×778, 9 marqueurs, 15 tuiles, attribution OSM ✅ |
| Clic réel sur un point | ouvre la card (ex. « Aeropuerto de Sauce Viejo ») ✅ |
| Contenu card | Antes 2.476.830 kWh · 289,8 kWh/m² · Después 1.724.413 · 201,8 · **Reducción 30,4 %** (resalté) · 752.417 kWh ✅ |
| Toggle Proyecto | désactivé (fase « Proyecto ejecutivo » non démarrée) ✅ |
| Console | aucune erreur/avertissement ✅ |

## État de l'Étape 4
Cœur **terminé** : Inicio (Agenda, Gestión, panneau central + carte de sélection, bande du bas Datos/Documentos/Progreso) **et** page Mapa.
**Reporté (sur décision utilisateur)** : contenu du mode « Proyecto global », contenu détaillé de la bande du bas en mode global, **câblage des 4 filtres GP/EE/AyS/G**.

## Suite possible
- Items reportés ci-dessus (sur décision), ou **Étape 5 — PWA offline** (cacher le shell + le dernier `/api/snapshot`, bannière « Sin conexión — solo lectura »).
