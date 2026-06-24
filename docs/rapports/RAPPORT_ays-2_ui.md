# Requisitos AyS — sous-lot 2 : bascule UI

**Date :** 2026-06-24
**Périmètre :** AyS quitte « Medidas del proyecto » ; nouvelle section Admin « Requisitos AyS » ; bloc AyS du dashboard refait ; colonne AyS retirée du Resumen ; nettoyage des lignes `medidas.ays`.

## Ce qui a été fait

### Retrait d'AyS des medidas
- `lib/constants.ts` : `ays` retiré de `MEDIDAS` (+ type `MedidaCode`, couleur `MED_AYS`). → disparaît **automatiquement** de l'éditeur Medidas, du tableau **Resumen** (colonne AyS) **et de l'export Excel** (tous itèrent `MEDIDAS`).
- `app/admin/actions.ts` : `"ays"` retiré de `MEDIDA_CODES`.
- `components/admin/medidas-editor.tsx` : placeholder AyS mort supprimé.
- `components/dashboard/medidas-blocks.tsx` : groupe « Especificidades AyS » retiré.
- **DB (migration 013)** : `delete from peebcoolsf_medidas where medida='ays'` (texte déjà migré en 012).

### Admin — nouvelle section « Requisitos AyS »
- `components/admin/ays-requisitos-editor.tsx` (nouveau) : 3 groupes MGAS **repliables** (repliés par défaut, compteur N/total), cases à cocher par plan, + **zone de texte libre** (textarea, remontée par sous-projet).
- `subproyectos-panel.tsx` : état `aysReq` (optimiste) + `aysCheckedOfSelected` + handlers `onAysToggle` (→ `setAysRequisito`) / `onAysText` (→ `updateSubproyecto("ays_texto")`) ; nouvelle Section 4 « Requisitos AyS » (Gestión devient Section 5) ; nettoyage à la suppression d'école.
- `admin-tabs.tsx` + `app/admin/page.tsx` : chargement `listAysRequisitos()` et passage jusqu'au panneau.

### Dashboard — nouveau bloc AyS
- `components/dashboard/ays-block.tsx` (nouveau) : titre « Ambiental y social », **texte libre** en haut, puis les **plans cochés groupés** par section MGAS (réf. §). Affiche « Sin información » si vide.
- `bottom-band.tsx` : `aysBySub` (codes cochés/sous-projet) + rendu du bloc AyS pour le bâtiment sélectionné, sous les blocs Medidas.

## Vérifications

- `npx tsc --noEmit` ✅ · `npx eslint app/admin components/admin components/dashboard lib/constants.ts` ✅
- DB (MCP) : `medidas.ays` = 0 ; 8 medidas distinctes ; `ays_texto` conservé (9 subs).
- `/api/snapshot` : `medidas` sans `ays` ; `aysRequisitos`=0 ; `subproyectos[].ays_texto` présent. `/`, `/admin`, `/calendario` → 200.
- ⚠️ **Vérif visuelle/interactive à faire dans le navigateur** (un `next dev` perso occupe le port 3000 → aperçu géré indisponible). À contrôler : Admin → Gestión de subproyectos → section « Requisitos AyS » (déplier un groupe, cocher) ; Inicio → Subproyectos → bloc « Ambiental y social » (texte + plans cochés) ; Resumen sans colonne AyS.

## Note
- Cohérence ~60 s côté dashboard (cache SWR du snapshot) après une modif Admin.
- `addSchool` pré-remplit déjà les 17 requisitos (sous-lot 1).
