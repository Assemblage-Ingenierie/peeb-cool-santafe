# Calendario — sous-lot 1 : grille mensuelle + fuseau horaire

**Date :** 2026-06-22
**Périmètre :** CDC §4.3 (Calendario) — vue mensuelle type Google Agenda de tous les `eventos`. Première brique : snapshot étendu + grille navigable + conversion d'horaires Argentine⇄France. (Le détail d'un événement au clic = sous-lot 2.)

## Ce qui a été fait

1. **Snapshot étendu** (`lib/snapshot.ts`, **sans migration DB**) : `SnapshotEvento` expose désormais `formacion` (bool) et `url_documento` (string|null) ; ajoutés à `RawEvento`, au `select` et au mapping. La table `peebcoolsf_eventos` contenait déjà ces colonnes.
2. **Page** `app/calendario/page.tsx` : remplacement du placeholder par une coquille serveur montant `CalendarioClient` (même pattern que `app/page.tsx` → `DashboardClient`).
3. **`components/calendario/calendario-client.tsx`** (`"use client"`) : lecture via `useSnapshot` (`/api/snapshot`), état du mois affiché, navigation **‹ / › / Hoy**, titre « Mes Año » (es), **sélecteur de fuseau** des horaires.
4. **`components/calendario/month-grid.tsx`** : grille 7 colonnes **lundi→dimanche**, nombre de semaines dynamique (4–6), jours du mois en avant, jours adjacents estompés, **jour courant surligné** (pastille rouge `--accent`). Événements en **pastilles couleur pleine** de la composante (réutilise `getComponente` + style de `components/dashboard/agenda.tsx`), triés par heure, format `HH:MM Nom`, débordement **« +N más »** (max 3/jour). Événements sans nom ignorés (cohérent avec l'Agenda).
5. **`components/calendario/fechas.ts`** : helpers de dates **anti-fuseau** + conversion horaire.

## Décisions

- **Anti-fuseau** : `fecha` (« AAAA-MM-DD ») découpée à la main ; jours de la grille construits en local (`new Date(y, m, d)`) ; **jamais** `new Date("AAAA-MM-DD")`.
- **Horaires** : saisis en **heure d'Argentine** (confirmé par l'utilisateur). Sélecteur en haut à droite **Argentina (GMT−3) ⇄ Francia (GMT+1/+2)**, indicateur + bascule. Défaut **Argentine**, choix mémorisé (`localStorage`). Conversion FR = instant UTC (`AR + 3h`) formaté en `Europe/Paris` via `Intl` → **heure d'été française gérée automatiquement**. L'offset affiché suit le mois consulté.
- **L'événement ne change pas de jour** selon le fuseau : seule l'heure affichée change (aucun événement en soirée → pas de passage de minuit en pratique).
- **Portée** : page Calendario uniquement (l'Agenda du dashboard reste en heure d'Argentine).
- **Pas de bouton « + »** vers l'Admin (reporté sur décision utilisateur). Création/édition toujours dans Admin → Calendario.
- Hydratation : en chargement (= rendu serveur) on n'affiche rien qui dépende de `new Date()` ; l'en-tête daté et la grille ne sont rendus que côté client → pas de décalage serveur (UTC)/client.

## Vérifications

- `npx tsc --noEmit` ✅ · `npx eslint components/calendario app/calendario lib/snapshot.ts` ✅
- `/api/snapshot` renvoie `formacion`/`url_documento` (7 événements) ✅
- `/calendario` → HTTP 200 + coquille client ✅
- Conversion empirique (Node) : 11:00 AR (18/06) → **16:00** FR ; (hiver 15/01) → **15:00** FR ; offsets FR juin **GMT+2** / janvier **GMT+1**, AR **GMT−3** ; 1ᵉʳ juin 2026 = lundi → grille de juin alignée 1ʳᵉ colonne ✅
- *Vérif visuelle non capturée : un `next dev` tourne déjà sur le port 3000 → aperçu géré évité (conflit `.next`). À voir directement sur `/calendario`.*

## Suite

- **Sous-lot 2** : détail d'un événement au clic (popover/modal) — nom, date + horaire (dans le fuseau actif), `lugar`, `modalidad` (+ lien `url_conexion` si Virtual), participantes (labels résolus), badge **Formación** si `formacion`, lien `url_documento` si présent.
- **Reporté (sur décision utilisateur)** : câblage des 4 filtres GP/EE/AyS/G du header ; création/édition dans la vue ; vues semaine/jour ; bouton « + ».
