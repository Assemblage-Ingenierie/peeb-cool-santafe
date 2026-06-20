# Étape 4.1b — Carte de sélection (Dashboard)

> **Date :** 2026-06-19 · 3ᵉ sous-lot de l'Étape 4. Lecture seule (via `/api/snapshot`), aucune migration.

## Objectif
Remplacer l'emplacement réservé du panneau central par une **carte OpenStreetMap de sélection** : un point par sous-projet, coloré selon la typologie ; le clic sélectionne le sous-projet (état partagé avec le tableau). **Pas de card de données** ici — c'est la page Mapa (§4.2).

## Dépendances ajoutées
- `leaflet@^1.9.4`, `react-leaflet@^5.0.0` (compatible React 19), `@types/leaflet@^1.9.21`.

## Livré
- **`components/dashboard/subproyectos-map.tsx`** (`"use client"`) : `MapContainer` + `TileLayer` (tuiles **OSM directes**, CDC §6, attribution OSM), un **`CircleMarker` par sous-projet** coloré via `getTipologia` (A/H/E). Recadrage automatique sur les points (`fitBounds`). Clic → `onSelect`. Sélection mise en valeur (rayon agrandi + anneau clair). Survol → infobulle avec le nom.
- **`components/dashboard/seguimiento-panel.tsx`** : carte chargée en **import dynamique `ssr:false`** (Leaflet a besoin de `window`) et **montée uniquement quand le panneau est déplié** (évite tout souci de dimension à hauteur nulle + chargement paresseux). Reçoit `expanded`.
- **`components/dashboard/dashboard-client.tsx`** : passe `expanded` au panneau.

## Choix techniques
- **`CircleMarker`** (vectoriel) plutôt que les marqueurs à image → couleur native par typologie et **zéro problème d'asset d'icône** Leaflet dans le bundler.
- **Couleurs depuis `constants.ts`** : typologies via `getTipologia`, anneau/repli via tokens `UI` (aucune couleur de marque en dur).
- Molette désactivée (`scrollWheelZoom={false}`) pour ne pas capturer le défilement de la page ; zoom par boutons +/−.

## Vérification (serveur de dev, contre la base réelle)
| Contrôle | Résultat |
|---|---|
| Montage de la carte (panneau déplié) | `.leaflet-container` 508×320, 9 tuiles, attribution OSM ✅ |
| Marqueurs | **9** (un par sous-projet), groupés sur Santa Fe + Rosario ✅ |
| Couleur par typologie | A/H (rouges) + E (bleu) ✅ |
| Sélection tableau → carte | clic « Centenario » → 1 marqueur à anneau clair ✅ |
| Sélection carte → tableau | clic 1ᵉʳ marqueur → ligne « Aeropuerto Internacional de Rosario » surlignée ✅ |
| Filtre → carte + tableau | Aeropuertos = 2 / Escuelas = 5 (marqueurs **et** lignes), recadrage ✅ |
| Console | aucune erreur ✅ |

## Données réelles
Lecture seule — aucune donnée modifiée.

## Suite
- **Étape 4.2 — page Mapa** : même carte, mais clic → **card** des consommations théoriques avant/après (kWh **et** kWh/m²), réduction (kWh **et %**, le **% resalté**), avec **toggle factibilidad ⇄ proyecto** (désactivé tant que la fase « Proyecto ejecutivo » n'est pas démarrée — *En proceso* ou *Terminado*).
- **Plus tard** (sur décision) : contenu de la bande du bas, mode « Proyecto global », câblage des 4 filtres de composante.
