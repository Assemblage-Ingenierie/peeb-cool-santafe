# Étape 4.3b — Proyecto global : les 3 blocs + migration 008

> **Date :** 2026-06-20 · Sous le grand tableau du mode Proyecto global (capture V2). Inclut une **migration** (composante sur les documents de projet).

## Migration 008 (exécutée via `execute_sql`, projet EXTERNAL)
```sql
alter table public.peebcoolsf_documentacion_gp
  add column if not exists componente text
  references public.peebcoolsf_componentes(code);
```
- Ajoute `documentacion_gp.componente` (FK `peebcoolsf_componentes(code)`, nullable) — calqué sur le motif des autres tables. **Aucune donnée existante touchée.**
- Fichier : `supabase/migrations/20260620000008_documentacion_gp_componente.sql`.
- Vérifié : colonne `text` + `FOREIGN KEY (componente) REFERENCES peebcoolsf_componentes(code)` présentes.

## Livré
- **`lib/snapshot.ts`** : ajoute **`docsProyecto`** (documentacion_gp : `nombre`, `url`, `componente`, `publicar`) au snapshot.
- **`lib/admin/config.ts`** + **`components/admin/admin-tabs.tsx`** : colonne **Componente** (menu GP/EE/AyS/G) sur « Documentación de proyecto » → permet de classer les documents.
- **`components/dashboard/global-blocks.tsx`** (nouveau) — 3 blocs du mode global :
  - **Datos técnicos** : **totaux calculés** sur les 9 sous-projets (option A) — superficie, demanda actual/proyectada, ahorro (kWh + %), GEI iniciales + reducción, costo total, beneficiarios (personal/usuarios/población). Calculs dérivés (`economiaKwh`/`economiaPct`/`suma`/`sumBy`).
  - **Documentos** : 3 sections **EE / AyS / G** (depuis `docsProyecto`, filtrées par composante), liens cliquables si URL. *(Vides tant que les documents ne sont pas classés en Admin — tous `componente=null` aujourd'hui.)*
  - **3ᵉ bloc** : sans titre (placeholder « Por definir »).
- **`components/dashboard/bottom-band.tsx`** : en mode Proyecto global, rend `GlobalBlocks` (au lieu des placeholders).

## Vérification (serveur de dev — via DOM/styles ; capture d'écran toujours indisponible)
| Contrôle | Résultat |
|---|---|
| Migration componente | colonne + FK OK ✅ |
| `/api/snapshot` → `docsProyecto` | 8 docs (Manual Operativo, Plan de adquisiciones, …) ✅ |
| Datos técnicos = totaux | **= sommes DB** : demanda 7.964.344 · despues 5.045.963 · ahorro 36,6 % · GEI 2.100,3 · superficie 31.070 · personal 829.417 · usuarios 3.426.023 · población 7.595.472 ✅ |
| Documentos sections | Eficiencia energética / Ambiental y social / Género ✅ (docs vides : non classés) |
| 3ᵉ bloc | « Por definir » ✅ |
| Admin (`/admin`) | 200, sans erreur (colonne Componente ajoutée à GP) ✅ |
| Console | aucune erreur ✅ |

## Suite
- **Classer les documents** (Admin → Documentación de proyecto → Componente) pour peupler les sections EE/AyS/G.
- Reporté : contenu du **3ᵉ bloc**, **câblage des 4 filtres GP/EE/AyS/G** (les sections Documentos pourront être filtrées par ces boutons).
