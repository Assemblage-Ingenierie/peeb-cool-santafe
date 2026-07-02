# Cronograma — sous-lot 1 : socle + rendu Gantt (données inventées)

Nouvelle page **Cronograma** (Gantt). **Prototype** : dates/durées **inventées** pour
travailler le rendu, comme demandé.

## Ajouté
- Sidebar : entrée « Cronograma » (`lib/nav.ts` + icône dans `icons.tsx`), entre
  Hojas de ruta et Calendario.
- Route `app/cronograma/page.tsx` → `components/cronograma/cronograma-client.tsx`.

## Rendu Gantt (`cronograma-client.tsx`)
- **Axe temporel** 2026→2030, en-tête années + unités selon la **granularité**
  (boutons **Semana / Mes / Trimestre**). Colonne de libellés gelée (sticky) +
  timeline défilable horizontalement ; gridlines par unité.
- **Sections** à bandeau noir ; **barres** positionnées par date, pleine couleur
  pendant la durée puis **excédent hachuré** (hachures diagonales blanches) jusqu'à
  la fecha fin. Étiquette au départ de la barre.
- **Couleurs = composantes** (GP/EE/AyS/G). **Fases** des sous-projets en **bleus
  progressifs**. Obras en segments Pliegos (gris) │ Licitación (gris foncé) │ Obras (rouge).
- **Réagit à « Vista / Rol »** : Todo (GP) → toutes les sections ; une composante →
  section de ses activités + section sous-projets. **Sélecteur** global / sous-projets
  (masqué en vue composante, per spec).

## Vérification (aperçu :3000)
- Rendu conforme à l'esprit de l'exemple (sections, barres couleur, hachures,
  bleus de fases, segments d'obra). `npm run lint` + `tsc --noEmit` verts.

## À suivre (itérations)
- Brancher les **vraies tâches** des feuilles de route (lib/roadmap) + périodes
  réelles (fecha_inicio / duración / fecha_fin) au lieu des données inventées.
- Affiner les 3 modes exactement (GP/global vs GP/sous-projet vs composante),
  placement des étiquettes (lisibilité sur barres foncées GP), tons de bleu par fase.
