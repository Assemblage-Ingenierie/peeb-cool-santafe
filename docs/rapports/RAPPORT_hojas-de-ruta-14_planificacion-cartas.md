# Hojas de ruta — sous-lot 14 : planification des cartes (fecha inicio + duración)

Premier des deux lots pour lier les tâches à Admin / Fases. **Lot 2 = Admin / Fases**
(colonne durée + sous-lignes de tâches repliables) à venir.

## Décisions validées
- Trois champs **indépendants** : fecha inicio / duración estimada / fecha fin
  (« estimada » → ne calcule rien). Aucun calcul automatique.
- Les **cartes** n'affichent que **inicio + duración** (fecha fin se saisira en Admin).

## Base de données — migration 016 (`20260701000016_roadmap_fechas_duracion.sql`)
- `peebcoolsf_roadmap_estado` (par tâche) : `fecha_inicio` (date), `fecha_fin` (date),
  `dur_valor` (int), `dur_unidad` (text: dia|semana|mes).
- `peebcoolsf_gestion_lineas` (fases) : `dur_valor`, `dur_unidad` (fechas déjà là).
  → utilisées au Lot 2.

## Code
- `lib/constants.ts` : `DURACION_UNIDADES` (día/semana/mes, singulier + pluriel).
- `lib/format.ts` : `formatDuracion(valor, unidad)` → « 3 semanas » / « 1 día » / null.
- `lib/snapshot.ts` : select + type + mapping étendus (4 champs).
- `app/hojas-de-ruta/actions.ts` : `roadmapSetPlan(feuille, tareaKey, patch)` — upsert
  partiel (seuls les champs fournis) ; valide l'unité et l'entier > 0.
- `hojas-de-ruta-client.tsx` : état `planes` + hydratation ; éditeur admin gagne
  « Fecha inicio » (date) et « Duración estimada » (número + menu día/semana/mes) ;
  ligne d'affichage « Inicio: JJ/MM/AAAA · N unidades » au-dessus du responsable
  (toujours visible, « — » si vide). Envoi de l'état fusionné (anti-perte au debounce).

## Vérification (aperçu réel :3000)
- Éditeur : champs présents ; saisie inicio=2026-09-15, durée=3 semanas.
- DB : `fecha_inicio=2026-09-15, dur_valor=3, dur_unidad=semana, fecha_fin=null`
  (fin bien intacte — champs indépendants).
- Carte : « Inicio: 15/09/2026 · 3 semanas ». Aucune erreur console.
- Données de test supprimées (aucune donnée réelle touchée).
- `npm run lint` + `tsc --noEmit` verts.

## Lot 2 (à venir)
Admin / Fases : colonne « Duración estimada » (número + día/semana/mes) entre inicio
et fin ; sous-lignes de tâches repliables par fase (synchronisées avec Hojas de ruta,
via un modèle de cartes partagé) avec inicio / durée / fin.
