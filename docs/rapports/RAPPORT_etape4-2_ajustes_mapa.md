# Étape 4.2 — Ajustes Mapa (card compacte, cadrage province, filtre, % optionnel)

> **Date :** 2026-06-19 · Retours utilisateur sur la page Mapa. Lecture seule, aucune migration.

## Demandes traitées
1. **Card « par ville » mal proportionnée → plus compacte.**
   - Cause : Leaflet applique `margin: 18px 0` aux `<p>` dans les popups → la zone Réduction était très étirée.
   - Fix (`datos-card.tsx`) : la zone Réduction n'utilise plus de `<p>` (Leaflet ne les marge plus) ; **libellé « Reducción » + kWh sur une même ligne**, le **% en gros dessous**. Padding resserré (`px-3 py-2`).
2. **Vue par défaut = Provincia de Santa Fe sur toute sa hauteur.**
   - `subproyectos-map.tsx` : nouvelle prop `initialBounds` (cadre fixe, appliqué **une seule fois** → le filtre ne recadre pas). `mapa-client.tsx` passe les bornes de la province (`[[-34,-62.9],[-28,-58.7]]`).
   - **Robustesse** : `requestAnimationFrame` + `map.invalidateSize()` avant `fitBounds` → corrige le **démarrage à froid** qui partait au zoom max (conteneur en `calc()` non mesuré au montage → carte vide).
3. **Filtre par type de bâtiment** (Todos / Aeropuertos / Hospitales / Escuelas) sur la page Mapa.
4. **Case « Mostrar % de reducción »** : affiche une **étiquette permanente** du % de réduction (factibilidad) à côté de chaque point, sans clic. Prop `renderTooltip` (étiquette personnalisable : nom au survol, ou % permanent).

## Vérification (serveur de dev)
| Contrôle | Résultat |
|---|---|
| Card Réduction (Sauce Viejo) | compacte : « Reducción … 285.937 kWh » sur une ligne, « 28,0 % » dessous ✅ |
| Vue par défaut | Province de Santa Fe pleine hauteur (zoom 7, tuiles chargées) — **rechargement à chaud ET à froid** ✅ |
| Filtre Aeropuertos | 2 marqueurs (carte non recadrée) ✅ |
| Case % | 9 étiquettes permanentes (« 30,4 % », « 28,0 % », …) ; suit le filtre ✅ |
| Pas de popup auto à l'ouverture | 0 ✅ |
| Console | aucune erreur ✅ |

## Notes
- L'étiquette % utilise l'escenario **factibilidad** (le seul rempli ; proyecto vide en base).
- `globals.css` inchangé (piste de surcharge Leaflet abandonnée au profit des `<div>`).
