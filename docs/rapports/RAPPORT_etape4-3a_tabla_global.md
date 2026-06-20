# Étape 4.3a — Proyecto global : grand tableau « Resumen »

> **Date :** 2026-06-20 · Mode « Proyecto global » du Dashboard (capture V2 + onglet *Resumen* de `PEEB Santa Fe - Tabla general.xlsx`). Lecture seule, aucune migration.

## Décision de cadrage (validée)
Le tableau s'appuie sur les **9 sous-projets** de la base (option A). L'onglet *Resumen* est plus fin (lignes EE/Renovables par bloc) et a des colonnes **solaire** et **análisis financiero** absentes de la base → reportées (ajout de données ultérieur si besoin).

## Livré
- **`components/dashboard/global-table.tsx`** (nouveau) : tableau **style sombre** (tokens `UI`), en-têtes **groupés** sur 2 niveaux, sticky.
  - **Groupe « Progresión » en 1er** : une colonne par fase (ordre `FASES`), case colorée selon l'estado → **jauge** (terminado = vert `#b6d7a8`, en_proceso = jaune `#ffd966`, sin iniciar = vide).
  - Groupes de données (depuis la base) : **Datos del edificio** (Edificio, Tipo [pastille], Dirección, Superficie) · **Consumos de energía** (antes/después kWh + kWh/m², ahorro kWh + kWh/m² + %) · **Emisiones de GEI** (antes/después tCO₂ + /m², reducción tCO₂ + %) · **Costos de inversión** (EE/otras/total € + €/m²) · **Beneficiarios** (personal/usuarios/población + % mujeres).
  - **Menu « Columnas »** (cases à cocher) pour afficher/masquer chaque groupe. **Export CSV** (UTF-8 BOM, s'ouvre dans Excel) des groupes visibles.
  - **~10 lignes** visibles : conteneur `max-height` + **défilement** (vertical et horizontal) + **redimensionnable** (`resize: vertical`).
- **`lib/calc.ts`** : ajout `porM2` (alias générique de `kwhPorM2`) + `suma` (total des coûts ; null si une valeur manque). Tous dérivés, jamais stockés.
- **`components/dashboard/dashboard-client.tsx`** : le tableau s'affiche en mode **Proyecto global**, au-dessus des blocs.

## Vérification (serveur de dev — via DOM/styles ; capture d'écran indisponible)
> ⚠️ L'outil de **capture d'écran était en échec** (timeout, y compris sur `/mapa` qui marchait avant → souci d'infra du service de capture, pas de la page). Tout vérifié par inspection du DOM et des styles calculés.

| Contrôle | Résultat |
|---|---|
| Tableau en mode global | titre « Resumen del proyecto », 6 groupes, **9 lignes** ✅ |
| Style sombre | conteneur `#30323e`, bandeau d'en-tête `#272a33`, redimensionnable (`resize: vertical`) ✅ |
| Jauge Progresión | cases vert `#b6d7a8` / jaune `#ffd966` (SUB-AIR : Estudios=terminado, Anteproyecto=en proceso) ✅ |
| Valeurs (SUB-AIR) | 8.547 m² · 2.476.830 kWh · 289,8 kWh/m² · 1.724.413 · 201,8 · 752.417 ✅ |
| Menu « Columnas » | masquer « Beneficiarios » → 6→5 groupes, 43→36 colonnes ; réaffichage OK ✅ |
| Export CSV | clic sans erreur ✅ |
| Console | aucune erreur ✅ |

## Suite — 4.3b (les 3 blocs sous le tableau)
- **Datos técnicos** (totaux du projet), **Documentos** (3 sections EE/AyS/G), 3ᵉ bloc sans titre.
- **Documentos** = documents de « Documentación de proyecto » répartis par composante → nécessite d'**ajouter un champ `componente` (GP/EE/AyS/G)** à `documentacion_gp` : **migration** dont je proposerai le SQL **avant** exécution.
