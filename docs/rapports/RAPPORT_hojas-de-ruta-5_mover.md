# RAPPORT — Hojas de ruta, sous-lot 5 : mover + fix marges

Date : 2026-06-25
Branche : main

## Objectif
Dernier morceau d'édition : **mover** (réordonner les cartes par glisser-déposer).
+ correction d'un défaut visuel signalé : marges blanches sous certaines cartes.

## Modifications
- `components/hojas-de-ruta/hojas-de-ruta-client.tsx` :
  - **Fix marges** : `items-start` sur le conteneur de cartes. Avant, le `align-items:
    stretch` par défaut étirait les cartes courtes à la hauteur de la plus grande de la
    ligne → vide blanc sous le pied. Désormais chaque carte garde sa hauteur naturelle.
  - **Mover** (admin) : cartes `draggable` (sauf en édition/comentario/liaison) ;
    glisser-déposer réordonne au sein d'une même fase (drop = insère avant la cible).
    Ordre LOCAL par `${seleccion}::${faseCode}` (`orden`). Indicateurs visuels : carte
    en cours de drag atténuée, cible entourée (ring focus). Curseur `grab`.
  - Les flèches (enlazar) se recalculent après réordonnancement (`orden` ajouté aux
    deps de l'effet de mesure).

## Vérifications (via DOM — captures de l'aperçu en timeout sur cette page)
- `npm run lint` : vert.
- Marges : `clientHeight - scrollHeight = 0` sur les 16 cartes (aucun vide) ; hauteurs
  redevenues naturelles/différentes (ex. Identificación 120 px, Plan de gestión 85 px).
- Mover : 16 cartes `draggable=true` en admin ; glisser-déposer simulé (dragstart puis
  drop sur des ticks séparés) → « Plan de gestión del Patrimonio » déplacé en tête
  d'Anteproyecto. (Note : la simulation doit séparer dragstart et drop pour laisser
  `dragKey` se poser ; en usage réel les gestes sont naturellement séparés.)

## État de l'édition admin (périmètre demandé — local)
- ✅ Marcar realizada · ✅ Comentario · ✅ Editar texto/responsable · ✅ Enlazar
  (flèches) · ✅ Mover (réordonner).

## Suite
- **Persistance DB** : table `peebcoolsf_` + écriture via MCP + intégration snapshot,
  pour tout l'état d'édition (realizada, comentario, ediciones, enlaces, orden, ANO AFD).
- (Option) déplacer une carte d'une fase à une autre (actuellement réordonnancement
  intra-fase uniquement).
