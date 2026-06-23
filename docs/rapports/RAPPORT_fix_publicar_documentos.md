# Correctif — les blocs Documentos ignoraient `publicar`

**Date :** 2026-06-22
**Signalé par l'utilisateur :** Inicio → Proyecto global → Documentos affichait les documents « Auditoria » alors que leur `publicar` est décoché.

## Diagnostic

`publicar` (CDC §4.4) contrôle la visibilité sur les **pages publiques** (filtré à l'affichage). Deux blocs l'ignoraient :
- **Mode global** (`components/dashboard/global-blocks.tsx` → `docsProyecto`) : filtré par composante uniquement.
- **Mode subproyectos** (`components/dashboard/bottom-band.tsx` → `documentos`) : `SnapshotDocumento` ne portait même pas `publicar` (ni le snapshot ne le récupérait).

De plus, `/api/snapshot` (servi publiquement, lu en `service_role` donc hors RLS) **exposait les titres/URL de documents non publiés** dans le JSON.

Données confirmées : 9 docs « Auditoria » (GP-DOC-0016→0024, EE, `publicar=false`) s'affichaient à tort dans le bloc global ; côté gestion de sous-projet, 32 docs `publicar=false` vs 4 `true`.

## Correctif (`lib/snapshot.ts`)

Filtrage **à la source** `publicar=true` pour les deux types de documents :
- `documentacion_gp` : `.eq("publicar", true)` sur la requête → `docsProyecto` ne contient que les publiés.
- `gestion_lineas` (documents, hors `etapa`) : `publicar` ajouté au `select` + filtre `r.publicar === true` dans le split (les **fases** ne sont pas concernées).

Conséquences : les documents non publiés ne sont **ni affichés ni présents dans le JSON public** (corrige le bug ET la fuite de données). Aucun changement du code d'affichage (les deux blocs rendent ce que le snapshot fournit).

## Vérifications (navigateur, serveur géré)

- `tsc` + `eslint lib/snapshot.ts` OK.
- `/api/snapshot` : `docsProyecto` = 21 (tous `publicar=true`), **0 « Auditoria »** ; documents de sous-projet exposés = 4 (publiés).
- Inicio (global) → bloc Documentos : 11 entrées (MGAS, PPPI, PCAS, annexes, Plan de Género), **aucune « Auditoria »**.

## À connaître

- Le bloc Documentos du mode **Subproyectos** ne montre désormais que les documents `publicar=true` (4 sur 36). Les 32 autres réapparaîtront dès que leur interrupteur **Publicar** sera activé dans l'Admin. C'est le comportement attendu de `publicar`.
- Le snapshot étant en cache SWR (~60 s), un changement de `publicar` dans l'Admin se reflète sur les pages publiques sous une minute.
