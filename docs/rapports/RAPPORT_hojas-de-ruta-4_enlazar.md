# RAPPORT — Hojas de ruta, sous-lot 4 : enlazar (flèches de dépendance)

Date : 2026-06-25
Branche : main

## Objectif
Permettre à l'admin de **tracer des dépendances entre cartes** (flèches), dernière
brique de l'édition avec « mover » (à venir). État LOCAL (non persisté).

## Modifications
- `components/hojas-de-ruta/hojas-de-ruta-client.tsx` :
  - Bouton **« Enlazar »** par carte (action bar admin) → entre en mode liaison.
    En mode liaison : la carte source affiche « Cancelar », les autres « Elegir
    destino » (surcouche). Un bandeau rappelle le mode.
  - Clic sur une cible → crée une dépendance `from → to` (statKeys), sans doublon
    ni auto-référence.
  - **Overlay SVG** des flèches : positions mesurées dans le DOM (`useLayoutEffect`
    + `data-cardkey`), chemins bézier (vertical ou horizontal selon la disposition),
    **couleur = pied de la composante source** (`CARD_TONOS`), marqueur de tête par
    composante. Recalcul sur changement de sélection/vista/édition/panel + resize.
  - **Suppression** : poignée « × » au milieu de chaque flèche (admin) → retire la
    dépendance.

## Vérifications (via DOM — l'outil de capture coince sur cette page)
- `npm run lint` : vert.
- 16 cartes / 16 boutons « Enlazar » ; mode liaison : bandeau + « Cancelar » (source)
  + « Elegir destino » (15 autres).
- Création : flèche SVG tracée — `d` bézier correct, `stroke=#38761d` (AyS),
  `marker-end=url(#ah-AyS)`, overlay à la bonne largeur (969 px à viewport 1280).
- Suppression : clic « × » → flèche retirée (overlay vide).
- ⚠️ Gotcha aperçu : le viewport d'un serveur d'aperçu fraîchement démarré est à
  **0 px** tant qu'on ne fait pas `preview_resize` → mesures faussées (« 2 px ») et
  layout effondré ; redimensionner avant de mesurer/capturer. Aperçus aussi sujets à
  des timeouts de screenshot — vérifier via evals DOM.

## Suite
- **Mover** : réordonner les cartes (glisser-déposer), local.
- **Persistance DB** : table `peebcoolsf_` + écriture via MCP + snapshot, pour tout
  l'état d'édition (realizada, comentario, ediciones, enlaces, ANO AFD).
