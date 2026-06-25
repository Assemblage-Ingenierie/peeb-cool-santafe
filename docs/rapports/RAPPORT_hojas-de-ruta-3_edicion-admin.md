# RAPPORT — Hojas de ruta, sous-lot 3 : édition admin (realizada + comentario)

Date : 2026-06-25
Branche : main

## Contexte
Retour client : les cartes étaient display-only et ne « correspondaient » pas au
format validé, et on ne pouvait pas les éditer. Périmètre confirmé par le client :
édition admin (realizada, comentario, éditer texte/responsable, mover/enlazar),
**sauvegarde locale pour l'instant**. Ce sous-lot livre la 1ʳᵉ moitié (realizada +
comentario), réutilisant strictement le format de carte validé ensemble.

## Modifications
- `lib/constants.ts` : `COLOR_REALIZADA` (#1b5e20, vert foncé de la pilule).
- `components/hojas-de-ruta/hojas-de-ruta-client.tsx` :
  - **Toggle Usuario / Admin** (visible pour l'admin) ; les contrôles d'édition
    n'apparaissent qu'en vue Admin.
  - **Pilule « realizada »** par carte (admin) : ovale vert (coche blanche) quand
    coché → la carte s'atténue (opacité 0.45) ; la **pilule reste à pleine
    visibilité** (hors du calque atténué). En vue Usuario, la pilule n'apparaît que
    sur les cartes réalisées.
  - **Comentario** par carte (admin) : bouton « + Comentario » → textarea inline ;
    le commentaire s'affiche sur la carte (visible aussi en vue Usuario).
  - État LOCAL (clé `${seleccion}::${card.key}`) — **non persisté** (DB à venir).

## Vérifications (via DOM — preview screenshots indisponibles cette session)
- `npm run lint` : vert.
- Format de carte : en-tête `rgb(182,215,168)` = #b6d7a8 / pied `rgb(56,118,29)` =
  #38761d / pied = « ACEFE » / largeur 232 px. = format validé.
- 15 pilules realizada + 15 boutons comentario ; toggle Usuario/Admin présent.
- Pilule : clic → `aria-pressed=true`, contenu opacité 0.45, pilule
  `background-color: rgb(27,94,32)` + classe `text-white`.
- « Une carte par plan » (SUB-AIR, 6 requisitos cochés) : Proyecto ejecutivo = 8
  cartes (2 fixes + 6 plans), Licitación = 7 (1 fixe + 6 plans), No objeción AFD = 0.
- ⚠️ Le renderer de l'aperçu était instable (screenshots en timeout,
  `getComputedStyle` incohérent) → vérification structurelle, pas de capture.
  Confirmation visuelle finale à faire par le client sur localhost:3000.

## Ajout (2026-06-25) — Editar texto / responsable
- Bouton « Editar » par carte (admin) : formulaire inline (Nombre / Descripción /
  Responsable), surcharge LOCALE ; « Restablecer » réinitialise. Action bar par
  carte : « Editar | Comentario ».
- Vérifié : **build de production propre** (toutes les routes compilent, dont
  `/hojas-de-ruta`), édition du Responsable reflétée dans le pied de carte (capture
  à l'appui). Incident `.next` corrompu (404 généralisé + screenshots/timeout)
  résolu par purge de `.next` + rebuild — code applicatif jamais en cause.

## Suite
- **Mover y enlazar** : réordonner les cartes + tracer les dépendances (flèches).
- **Persistance DB** (table + écriture MCP + snapshot) de tout l'état d'édition.
