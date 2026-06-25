# RAPPORT — Hojas de ruta, sous-lot 2 : contenu AyS

Date : 2026-06-24
Branche : main

## Objectif
Remplir la **partie AyS** de la feuille de route pour toutes les feuilles (proyecto
global + chaque sous-projet), d'après la capture fournie : cartes de tâches AyS par
phase, certaines « dynamiques » (adaptées aux Requisitos AyS cochés en Admin).

## Modifications
- `lib/constants.ts` :
  - `CARD_TONOS` — tons des cartes (fond/bordure/texte) par composante, dérivés des
    couleurs §2.3 (source unique des couleurs de carte de la feuille de route).
  - `RESPONSABLE_DEFECTO = "ACEFE"`.
  - `RoadmapTarea` + `ROADMAP_AYS` — 15 tâches AyS réparties sur les 6 phases ; deux
    tâches `dinamica: true` (« Lineamientos para otros planes necesarios según
    proyecto » en Proyecto ejecutivo, « Conformidad de los planes solicitados » en
    Licitación).
- `components/hojas-de-ruta/hojas-de-ruta-client.tsx` :
  - Rendu des cartes AyS par phase (`TareaCard`), style sobre vert (CARD_TONOS),
    nom en gras + responsable ACEFE.
  - Cartes `dinamica` : listent les Requisitos AyS cochés du sous-projet sélectionné
    (résolus via `REQUISITOS_AYS` / `aysRequisitos` du snapshot, ordre stable) ;
    au niveau « Proyecto global » → note « Según los requisitos AyS de cada
    subproyecto » ; si rien de coché → « Sin requisitos AyS marcados ».
  - Disposition alignée sur la capture : **cartes à gauche, nom de phase à droite**.

## Choix
- Libellés des cartes traduits/normalisés en **espagnol** (cohérence UI), à partir
  du texte mixte FR/ES de la capture.
- Les cartes signalées en **orange** dans la capture = `dinamica` ; rendues en
  **vert** comme les autres (l'orange n'était qu'un repère, comme demandé).
- Cartes AyS identiques pour tous les sous-projets ; seules les cartes `dinamica`
  varient selon les requisitos cochés.
- « No objeción AFD » conservé tel quel (séparateur sobre + case admin) — non touché.
- Aucune écriture DB (tâches statiques en constants) → pas de migration. L'état
  « réalisée » et le commentaire admin des cartes viendront dans un sous-lot dédié
  (avec stockage DB).

## Vérifications
- `npm run lint` : vert.
- `GET /hojas-de-ruta` → HTTP 200 ; les cartes AyS rendues, responsable ACEFE ×15,
  note dynamique au niveau global présente.
- Snapshot : SUB-AIR a 6 requisitos AyS cochés → ses cartes dynamiques les listeront ;
  autres sous-projets sans requisitos → « Sin requisitos AyS marcados ».
- Aperçu visuel `preview_start` non lancé (port 3000 occupé par un `next dev`) →
  vérifié via HTTP/DOM.

## Ajuste (retour client — respect des décisions validées)
- **Format de carte validé** rétabli : en-tête coloré (nom en gras) / corps optionnel
  (description ou référence) / **pied foncé « Responsable »**. `CARD_TONOS` passe à
  des tons en-tête/corps/pied par composante (au lieu d'un simple fond plat).
- **Phases remises à gauche** (le libellé de phase avait été déplacé à droite à tort).
- **Tâches dynamiques = une carte par plan** AyS coché (et non une liste dans une
  seule carte) : en-tête = libellé du plan, corps = référence MGAS §, pied = ACEFE.
  Au niveau global, ou sans plan coché → une carte générique avec note.

## Suite
- Colonnes / cartes des autres composantes (EE, Género, GP).
- État « réalisée » (pilule) + commentaire admin sur les cartes + stockage DB.
- Dépendances (flèches) + mode admin (déplacer, relier, éditer).
