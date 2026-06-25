# RAPPORT — Hojas de ruta, sous-lot 1 : page + navigation + structure des phases

Date : 2026-06-24
Branche : main

## Objectif
Démarrer la nouvelle page **Hojas de ruta** : créer la page accessible depuis la
barre latérale, les boutons de navigation entre les feuilles de route (proyecto
global + une par sous-projet), et la **structure verticale des phases** du projet.
Le contenu des phases (cartes de tâches, dépendances, mode admin) viendra dans les
sous-lots suivants.

## Modifications
- `lib/nav.ts` : nouveau type d'icône `hojas` + entrée `NAV_ITEMS` « Hojas de ruta »
  (`/hojas-de-ruta`, visible par tous), placée après « Mapa ».
- `components/icons.tsx` : pictogramme `hojas` (timeline = points + lignes), même
  style trait que les autres icônes de nav.
- `app/hojas-de-ruta/page.tsx` : coquille serveur (rend `HojasDeRutaClient`).
- `components/hojas-de-ruta/hojas-de-ruta-client.tsx` : client.
  - Boutons de navigation (chips) : « Proyecto global » + un bouton par sous-projet
    (libellé = `nombre`, liste issue de `/api/snapshot`). Sélection en `useState`.
  - Structure verticale = les **7 fases chronologiques** (`FASES` de `lib/constants`
    filtrées de « General »), empilées : libellé fase à gauche, zone de contenu
    vide à droite (emplacement des futures cartes).

## Choix
- Navigation par **boutons** (chips qui passent à la ligne) plutôt qu'un menu
  déroulant — demandé par le client. Actif = fond foncé / texte blanc.
- « General » exclue de la séquence (transversale, hors chronologie), conforme aux
  maquettes validées.
- Libellés/ordre des fases = source unique `lib/constants.ts` (aucun libellé en dur).
- Aucune écriture DB dans ce sous-lot → pas de migration.

## Vérifications
- `npm run lint` : vert.
- `GET /hojas-de-ruta` → HTTP 200 ; les 7 fases rendues côté serveur dans l'ordre
  (Estudios preliminares → Obra), titre + bouton « Proyecto global » présents.
- Entrée sidebar `href="/hojas-de-ruta"` présente ; `/api/snapshot` renvoie les
  9 sous-projets (boutons peuplés côté client).
- Aperçu visuel `preview_start` non lancé (un `next dev` occupe déjà le port 3000) →
  vérifié via HTTP/DOM.

## Ajuste (2026-06-24)
- « No objeción AFD » n'est pas une phase numérotée : rendu comme un **jalon /
  espace réservé** (séparateur sobre, label centré entre deux filets, non numéroté)
  entre « Redacción de pliegos » (Fase 04) et « Licitación » (Fase 05). Les phases
  sont donc numérotées **01–06**. (Traitement « hito » rouge des maquettes possible
  si souhaité plus tard.)

## Suite (sous-lots à venir)
- Colonnes par composante + cartes de tâches (en-tête nom + état, corps doc de
  référence, pied responsable).
- Case « réalisée » (pilule ovale verte, carte atténuée) + commentaire admin.
- Dépendances (flèches) + mode admin (déplacer, relier).
- Stockage DB (tâches / dépendances / commentaires) + intégration snapshot.
