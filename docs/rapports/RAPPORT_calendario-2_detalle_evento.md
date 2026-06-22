# Calendario — sous-lot 2 : détail d'un événement au clic

**Date :** 2026-06-22
**Périmètre :** CDC §4.3 — popup de détail (lecture seule) au clic sur une pastille.

## Ce qui a été fait

- **`components/calendario/evento-modal.tsx`** (nouveau, `"use client"`) : modal centré (backdrop, fermeture par clic extérieur ou **Échap**, `role="dialog"`/`aria-modal`). En-tête à la couleur de la composante (titre + nom de composante). Corps : **Fecha** (DD/MM/AAAA), **Horario** (plage `HH:MM–HH:MM` dans le **fuseau actif**, avec libellé « Argentina/Francia, GMT±n »), **Modalidad** (+ lien **« Unirse a la reunión »** si Virtual et `url_conexion`), **Lugar**, **Participantes** (chips, labels déjà résolus), badge **Formación** si `formacion`, lien **« Ver documento »** si `url_documento`. Champs absents masqués.
- **`month-grid.tsx`** : les pastilles deviennent des **boutons** cliquables (focus visible, hover) qui remontent l'événement via `onSelect`.
- **`calendario-client.tsx`** : état `sel` (événement sélectionné) ; rend `EventoModal` ; respecte le fuseau choisi.
- **`fechas.ts`** : helpers `fmtFecha` (DD/MM/AAAA) + `horaRangoEnZona` (plage horaire convertie) + `ZONA_NOMBRE`.

## Décisions

- **Modal** plutôt que popover ancré (robuste, pas de calcul de position).
- L'horaire du détail suit le **fuseau actif** du calendrier (Argentine/France) et l'**offset est calculé sur le mois de l'événement** (heure d'été correcte).
- Liens `url_conexion`/`url_documento` : `target="_blank"` + `rel="noopener noreferrer"`.
- Lecture seule pour l'instant ; le bouton **Editar** (et le **+** créer) arrivent au sous-lot 3.

## Vérifications

- `npx tsc --noEmit` ✅ · `npx eslint components/calendario` ✅ · `/calendario` → HTTP 200 ✅
- Rendu visuel du modal non capturé (serveur dev déjà sur 3000 → aperçu géré évité) — à voir sur `/calendario` en cliquant une pastille.

## Suite

- **Sous-lot 3** : bouton **+** (créer) et **édition** des événements depuis le Calendario, pour tous (admin + non-admin). Nouveau chemin d'écriture (Server Actions « événements » avec garde d'autorisation ouverte en dev, à resserrer à l'Étape 6). Extension snapshot : `created_at` (événements) + liste `personas` (equipo + entidades) pour le sélecteur de participants.
- **Sous-lot 4** : alerte **« +N »** sur Inicio sous « Agenda » (nouvelles réunions depuis la dernière consultation, popup + remise à zéro au clic ; marqueur « vu » en localStorage faute d'auth ; visible pour l'admin — en dev, le bypass = admin).
- **Dépendance auth (Étape 6)** : la distinction admin/non-admin (qui voit l'alerte, qui passe par le +) est cosmétique tant que la connexion n'existe pas ; toute la mécanique est prête à s'activer dès Étape 6.
