# Requisitos AyS — sous-lot 1 : données + backend

**Date :** 2026-06-24
**Périmètre :** fondation du nouveau mécanisme AyS (checklist de plans MGAS + texte libre par sous-projet). Aucune UI à ce stade ; l'ancienne « medida » AyS reste en place (rien de cassé). Bascule UI = sous-lot 2.

## Ce qui a été fait

1. **Migration 012** (`execute_sql`, idempotente) :
   - Table **`peebcoolsf_ays_requisitos`** (`subproyecto_uid`, `requisito` = code §, `activa`), PK composite, RLS (lecture authenticated / écriture admin). Pré-remplie : **17 plans × 9 sous-projets = 153 lignes**, `activa=false`.
   - Colonne **`subproyectos.ays_texto`** (texte libre, 1 par sous-projet).
   - **Migration du texte** : `medidas.ays.texto` → `subproyectos.ays_texto` (les 9 sous-projets l'avaient → 9 copiés).
2. **`lib/constants.ts`** : `REQUISITOS_AYS` (3 groupes §10.5 / §10.6 / §10.7, 17 plans avec libellés exacts) + `REQUISITOS_AYS_CODES` + `refMgas(code)` → « MGAS §… ». (AyS **toujours** dans `MEDIDAS` à ce stade.)
3. **Snapshot** (`lib/snapshot.ts`) : `SnapshotSubproyecto.ays_texto` (+ select) ; `aysRequisitos` = requisitos **cochés** (filtré `activa=true` à la source) ; type `SnapshotAysRequisito`.
4. **Server Actions** (`app/admin/actions.ts`) : `setAysRequisito(sub, requisito, activa)` (upsert, code validé) ; `ays_texto` ajouté aux champs éditables de `updateSubproyecto` ; `addSchool` pré-remplit aussi les 17 requisitos.
5. **Lecture Admin** (`lib/admin/read.ts`) : `ays_texto` sur `SubproyectoRow` (+ select) ; `listAysRequisitos()` + type `AysRequisitoRow`.

## Vérifications

- `npx tsc --noEmit` ✅ · `npx eslint lib/snapshot.ts lib/constants.ts lib/admin/read.ts app/admin/actions.ts` ✅
- Base (MCP) : 153 lignes (9 subs × 17 codes), `activas=0`, RLS + 2 policies ; **9 sous-projets ont `ays_texto`** migré.
- `/api/snapshot` : `aysRequisitos`=0 (rien coché) ; `subproyectos[].ays_texto` présent (texte migré visible).

## Suite — sous-lot 2 (bascule UI)

- **Admin** : nouvelle section « Requisitos AyS » (3 groupes repliables + cases + texte libre) ; AyS retiré de « Medidas del proyecto » (retrait de `MEDIDAS`).
- **Dashboard** : colonne AyS retirée du Resumen ; nouveau bloc AyS (texte libre + plans cochés groupés).
- **Nettoyage** : suppression des lignes `medidas.ays` (texte déjà migré).
- Câblage page Admin → `listAysRequisitos`/`ays_texto` → `SubproyectosPanel`.
