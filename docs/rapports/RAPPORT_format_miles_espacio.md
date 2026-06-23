# Formatage des nombres — séparateur de milliers : espace (au lieu du point)

**Date :** 2026-06-22
**Demande utilisateur :** changement général — milliers et millions **espacés** plutôt que séparés par un point (ex. « 2.476.830 » → « 2 476 830 »).

## Changement

- **`lib/format.ts`** (source unique du formatage) : `fmtNumero` et `fmtPct` formatent toujours en es-AR, mais le **séparateur de groupe** (milliers/millions) est remplacé par une **espace insécable** (U+00A0) via `formatToParts` (type `group`). Les **décimales gardent la virgule** (es-AR). L'espace est insécable → un nombre ne se coupe jamais en fin de ligne. Séparateur défini par `String.fromCharCode(0xa0)` (source 100 % ASCII, pas d'ambiguïté d'encodage).
- **`components/admin/field-editor.tsx`** : l'affichage des champs numériques utilisait son propre `Intl.NumberFormat("es-AR")` → remplacé par `fmtNumero(num, 2)` (réutilise le formatage central, même rendu espacé). L'édition reste sur la valeur brute (inchangée).

Toutes les pages publiques (dashboard, mapa, tableau Resumen, cards Datos/Medidas) passent déjà par `fmtNumero`/`fmtPct` → changement **général** automatique.

## Vérifications (navigateur, serveur géré)

- Milliers espacés : « 31 070 m² », « 7 964 344 kWh », « 18 041 421 € ».
- Décimales en virgule conservées : « 36,6 % », « 754,2 tCO₂ ».
- `tsc` + `eslint lib/format.ts components/admin/field-editor.tsx` OK ; aucune erreur console.

## Note — export Excel

`app/api/export-resumen/route.ts` applique des formats de nombre **Excel** (`numFmt`) : c'est **Excel** qui affiche selon sa propre locale (le séparateur n'est pas géré par `fmtNumero`). Laissé tel quel. À aligner séparément si besoin (format Excel à séparateur d'espace).
