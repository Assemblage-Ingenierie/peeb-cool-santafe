# Récap — Étape 3.1 (suite) : persistance réelle GP + recherche / publicar / ajout

> **Date :** 2026-06-19 · Onglet **Gestión de proyecto → Documentación de proyecto** branché sur Supabase réel.

## Approche données (validée)
- **Lecture** : Server Component (`app/admin/page.tsx`, `export const dynamic = "force-dynamic"`) → `lib/admin/gp.ts` `listGp()` via **client `service_role` serveur** (`lib/supabase/server.ts`). **Sans cache**, table par table.
- **Écriture** : **Server Actions** (`app/admin/actions.ts`, `"use server"`) — `addGp`, `updateGpField`, `setGpFlag`, `deleteGp`. Chaque action vérifie l'autorisation (`assertAdmin`) puis `revalidatePath('/admin')`.
- **UID des nouvelles lignes : généré côté serveur** dans `addGp()` (max numérique existant + 1, format `GP-DOC-NNNN`). Cohabite avec les UID parlants du seed (`GP-DOC-MANUAL`…). Pas de séquence/trigger/verrou (admin unique).
- `service_role` **jamais exposé** (`server-only`, clé sans `NEXT_PUBLIC_`). Le `/api/snapshot` (cacheable) reste réservé au dashboard public (Étape 4) — **pas** utilisé par l'Admin.
- UI : mises à jour **optimistes** + Server Action ; en cas d'erreur, resynchro via `router.refresh()`.

## Composant `EditableTable` (générique, réutilisable 3.2/3.3)
- **Recherche/filtre client** (UID + colonnes texte) — aucune requête DB.
- **Publicar** : interrupteur neutre (`var(--text)`), **visuellement distinct** de la checkbox **rouge** Confidencial.
- **Ajout** de lignes (`onAdd`) + suppression + édition inline + UID copiable.
- Callbacks **granulaires** (`onCellCommit`, `onToggleConfidencial`, `onTogglePublicar`, `onAdd`, `onDelete`) branchés sur les Server Actions.

## CRUD vérifié de bout en bout (contre la base)
| Opération | Résultat en base |
|---|---|
| Lecture | 6 lignes du seed chargées ✅ |
| Ajout | `GP-DOC-0001` créé (UID serveur) ✅ |
| Édition inline | `nombre_documento = "Documento de prueba"` ✅ |
| Toggle confidencial | `true` ✅ |
| Toggle publicar | `true` ✅ |
| Suppression | ligne retirée → retour à 6 ✅ |
| Recherche | « Plan » → 2 lignes (client) ✅ |

*(Ligne de test supprimée ; base laissée propre = 6 documents du seed.)*

## Charte
- Header porté à **72 px** : logos Assemblage / AFD / Santa Fe **alignés** (même axe horizontal, centre à 36 px), hauteurs similaires (44/40/36). Token accent rouge `#E30513` sur l'item de nav actif.

## Fichiers
**Nouveaux** : `lib/supabase/server.ts`, `lib/admin/gp.ts`, `app/admin/actions.ts`, `supabase/migrations/20260619000004_publicar.sql`.
**Modifiés** : `app/admin/page.tsx` (async + lecture), `components/admin/editable-table.tsx` (recherche/publicar/callbacks granulaires), `components/admin/admin-tabs.tsx` (persistance), `components/icons.tsx` (SearchIcon), `components/header.tsx` + `components/sidebar.tsx` (alignement logos), `package.json` (`@supabase/supabase-js`, `server-only`).
**Supprimé** : `components/admin/demo-data.ts` (données réelles désormais).

## Restant pour la réplication (3.2 / 3.3)
- Appliquer le même patron (lecture Server Component + Server Actions + UID serveur) aux autres tables.
- `gestion_lineas` : `url` grisé si `tipo_linea ≠ documento` ; drag & drop `orden`.
- Nettoyage des UID orphelins dans les `text[]` (participantes/entidades) à la suppression.
