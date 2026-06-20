# Étape 4.0 — Socle de lecture (`/api/snapshot` + calculs)

> **Date :** 2026-06-19 · Premier sous-lot de l'Étape 4 (Dashboard + Mapa). Lecture seule, aucune migration DB.

## Objectif
Mettre en place le **socle de toute lecture** du Dashboard et de la Mapa : un endpoint unique qui lit la base en `service_role` côté serveur (la clé n'est jamais exposée au client) et renvoie, en une fois et en cache, les données nécessaires.

## Livré (4 fichiers, aucune dépendance ajoutée)
- **`lib/snapshot.ts`** (`server-only`) — `getSnapshot()` : un seul aller-retour groupé (`Promise.all`) qui lit `subproyectos`, `metricas`, **fases** (étapes), `eventos`, + `equipo`/`entidades` pour résoudre les libellés des participants. Projection **fidèle** : valeurs brutes, NULL conservés, **aucun calcul dérivé stocké**.
- **`app/api/snapshot/route.ts`** — `GET` `force-dynamic`, renvoie le JSON avec en-tête `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` (SWR au CDN, **un seul endpoint, sans polling** — CDC §6). `public` sûr ici (snapshot sans donnée confidentielle ; à revoir si du contenu documentaire y est ajouté).
- **`lib/calc.ts`** — 3 calculs dérivés purs : `economiaKwh`, `economiaPct`, `kwhPorM2` → `null` si donnée manquante (jamais 0).
- **`lib/format.ts`** — formatage es-AR (`fmtNumero`, `fmtPct`) + constante `GUION` (« — ») : source unique du marqueur de donnée manquante.

## Forme du JSON
`{ generatedAt, subproyectos[], metricas[], fases[], eventos[] }`
- `metricas` : les 2 scénarios par sous-projet (`faisabilidad` / `proyecto`).
- `fases` : étapes (`tipo_linea='etapa'`) → sert (1) à décider le scénario par défaut + activer le toggle quand « Proyecto ejecutivo » est démarrée, (2) au futur bloc « Progreso ».
- `eventos` : UID participants bruts **+** `participantesLabels` résolus (équipo « Apellido, Nombre » | entidad).

## Décisions verrouillées (validées)
- **Carte** : `react-leaflet` v5 + Leaflet (tuiles OSM directes, popups React pour la card §4.2, chargé uniquement sur Inicio/Mapa). Repli : Leaflet « nu » si v5 coince à l'install.
- **Filtres composante** : partagés header → contenu via Context React (détail interne).
- **Scénario affiché** : `faisabilidad` par défaut ; sur la card de la carte (4.2), **toggle** factibilidad ⇄ proyecto, **désactivé** tant que la phase « Proyecto ejecutivo » n'est pas démarrée, et bascule par défaut sur proyecto une fois démarrée si les valeurs existent. *Hypothèse à reconfirmer en 4.2 : « démarrée » = `en_proceso` OU `terminado`.*

## Vérification (contre la base réelle, via le serveur de dev)
| Contrôle | Résultat |
|---|---|
| `GET /api/snapshot` | **200** ✅ |
| En-tête cache | `public, s-maxage=60, stale-while-revalidate=300` ✅ |
| Comptes | 9 subproyectos · 18 metricas · 72 fases · 3 eventos ✅ |
| Projection fidèle (NULL conservés) | SUB-AIR `notas`/`costo_otras_eur` = `null` ✅ |
| Libellés participants résolus | EVT-0001 → BHOYROO, Maël · PUDDU, Silvia · CORTESE RODRIGUEZ, Leticia ✅ |
| Phases « Proyecto ejecutivo » | toutes `null` → partout factibilidad, toggle désactivé (cohérent) ✅ |
| Page `/admin` | **200**, saine (erreurs `FASES`/`TIPO_LINEA` des logs = périmées, source actuelle propre) ✅ |

## Données réelles
Aucune donnée touchée (lecture seule). Les 2 événements vides (EVT-0002/0003, sans nom) sont des lignes utilisateur ; l'Agenda les ignorera à l'affichage (4.1), sans les supprimer.

## Suite
**4.1 — Inicio/Dashboard** : brancher les filtres (Context), Agenda réelle, sélecteur Todos/Aeropuertos/Hospitales/Escuelas + liste, tableau central (coquille), encart carte, zone basse en placeholders.
