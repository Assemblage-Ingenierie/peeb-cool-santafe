# Notas (whiteboard admin) + éclaircissement du gris des mesures

## 1. Gris des mesures inactives (tableau global, Inicio)
`global-table.tsx` : `MED_OFF` `#c7ccd3` → **`#e9ebef`** (gris très clair, quasi
invisible) pour que les mesures en couleur ressortent nettement.

## 2. Page « Notas » — whiteboard admin
- Sidebar : entrée **« Notas »** tout en bas, **admin uniquement** (`lib/nav.ts` +
  icône). Page `/notas` : garde admin (server component), lecture service_role.
- **Migration 017** (`peebcoolsf_notas`) : id · contenido · color
  (blanco | GP | EE | AyS | G) · x / y · creado_en. RLS **admin** (lecture + écriture).
- Server actions (`app/notas/actions.ts`) : `notaCrear(color,x,y)` / `notaActualizar`
  (contenu / couleur / position, partiel) / `notaEliminar`.
- `NotasClient` : tableau (fond pointillé) avec **post-its** colorés par composante ou
  blancs — **créer** (boutons par couleur), **écrire** (texte libre, sauvé au blur),
  **changer la couleur** (pastilles), **déplacer** (drag pointer), **supprimer** (✕).
  État optimiste + Server Actions.

## Vérification (aperçu :3000)
- Notas : création (color EE→DB), édition (texte persiste au blur), changement de
  couleur (→ G), suppression (→ 0). Rendu : barre AGREGAR, tableau, post-it complet.
- Données de test supprimées (table vide).
- `npm run lint` + `tsc --noEmit` verts.
