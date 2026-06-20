# Étape 4.1a — Inicio (Dashboard) : Agenda + Gestión + panneau central

> **Date :** 2026-06-19 · 2ᵉ sous-lot de l'Étape 4, d'après la **capture V2** (`Capture dashboard V2.png`). Lecture seule (via `/api/snapshot`), aucune migration.

## Périmètre (révisé d'après la V2)
- **Agenda** en haut, toujours visible.
- **Ligne « Gestión »** avec deux onglets : **Proyecto global** (défaut) / **Subproyectos**.
- En mode **Subproyectos**, un **panneau central se déplie** (sélecteur + tableau + emplacement carte).
- **Bande du bas** (Datos / Documentos / Progreso) : placeholders neutres, pour les deux modes.
- **Carte** : reportée au sous-lot **4.1b** (emplacement réservé pour l'instant).
- **4 boutons de filtre GP/EE/AyS/G** : **non câblés** (décision utilisateur — plus tard).

## Livré
- **`app/page.tsx`** : rend `DashboardClient` (coquille serveur → contenu interactif client).
- **`components/dashboard/use-snapshot.ts`** : récupère une fois `/api/snapshot` côté client (`loading` / `error` / `ready`). Types importés en `import type` (effacés à la compilation → la clé `service_role` ne fuit pas).
- **`components/dashboard/agenda.tsx`** : bande **scrollable horizontalement** ; événements **passés estompés** ; **calage par défaut sur le prochain à venir** ; clic sur le libellé « Agenda » **réinitialise** le défilement ; cartes colorées par composante ; **événements sans nom ignorés**.
- **`components/dashboard/seguimiento-panel.tsx`** : sélecteur **Todos / Aeropuertos / Hospitales / Escuelas** (filtre), **tableau** des sous-projets (pastille typologie A/H/E, colonnes de données = placeholders), **sélection** par clic (surlignage), emplacement carte (4.1b).
- **`components/dashboard/dashboard-client.tsx`** : orchestration — Agenda + onglets Gestión + dépliage animé (CSS `grid-rows`, `inert` quand replié, `motion-reduce` respecté) + bande du bas (`Datos`/`Documentos`/`Progreso`).

## Couleurs
Aucune couleur en dur : composantes via `getComponente` (bordure de carte Agenda), typologies via `getTipologia` (pastilles A/H/E), surfaces via les tokens `--surface/--border/--text/--focus`. Surlignage de sélection = `--focus` (bleu), distinct de l'accent de marque.

## Vérification (serveur de dev, contre la base réelle)
| Contrôle | Résultat |
|---|---|
| Chargement `/` + données | OK (sans erreur console) ✅ |
| Agenda — événement réel | « Présentacion de las auditorias · 19/06/2026 · 17:06 » + participants résolus (BHOYROO/PUDDU/CORTESE) ✅ |
| Agenda — brouillons vides (EVT-0002/0003) | ignorés ✅ |
| Agenda — couleur composante | bordure jaune EE (`#fff2cc`) ✅ |
| Gestión défaut = global | panneau central **replié** ✅ |
| Onglet « Subproyectos » | panneau **déplié** (9 sous-projets, pastilles A/H/E) ✅ |
| Filtre « Aeropuertos » | 2 lignes (Rosario + Sauce Viejo) ✅ |
| Sélection d'une ligne | surlignage (bord interne bleu) ✅ |
| Bande du bas | Datos / Documentos / Progreso « Por definir » ✅ |
| Console | aucune erreur/avertissement ✅ |

*Non exerçable visuellement faute de donnée : l'estompage des événements **passés** (tous les eventos actuels sont datés d'aujourd'hui). Mécanisme en place.*

## Données réelles
Lecture seule — aucune donnée modifiée. Les 2 événements vides restent en base (lignes utilisateur), simplement masqués de l'Agenda.

## Suite
- **4.1b** — carte de **sélection** (installe react-leaflet, points colorés par typologie, clic = sélection ; remonte la sélection au tableau). La carte ne sera montée que panneau déplié (éviter le souci de dimension Leaflet à hauteur nulle).
- **Plus tard** (sur décision) : contenu de la bande du bas, contenu du mode « Proyecto global », câblage des 4 filtres de composante, page **Mapa** (4.2, cards de données avec toggle factibilidad/proyecto).
