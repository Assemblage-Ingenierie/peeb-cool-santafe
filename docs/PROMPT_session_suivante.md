# Prompt — poursuite du projet PEEB Cool Santa Fe (nouvelle session)

> À coller dans une nouvelle session de Claude Code, **dans le dossier du repo** `C:\Users\maelb\github\PEEB Santa Fe`. La mémoire projet et `CLAUDE.md` se chargent automatiquement.

---

Tu reprends le développement de **PEEB Cool — Santa Fe** (app web PWA de suivi de réhabilitation énergétique, Assemblage ingénierie / AFD / Province de Santa Fe).

**Avant de coder, lis :** `CAHIER_DES_CHARGES_FR.md` (spec de référence), la mémoire projet (auto-chargée), et les derniers récaps dans `docs/rapports/` — surtout `RAPPORT_etape3-2_equipo_calendario.md` et `RAPPORT_etape3-3a_capacitaciones.md`. C'est aussi un **Next.js 16** avec des ruptures d'API : lis `AGENTS.md` et les guides `node_modules/next/dist/docs/` avant d'écrire du code (Server Components/Actions, caching).

## Règles impératives (ne pas dévier)
- **Supabase via le connecteur MCP uniquement**, jamais la CLI. **`execute_sql` en dev, JAMAIS `apply_migration`.** Projet **EXTERNAL** id `grnkbnldfzdzrgleorra`. Toutes les tables préfixées **`peebcoolsf_`**. Fonctions SECURITY DEFINER dans `peebcoolsf_private` (`search_path=''`). `execute_sql` pas atomique multi-statements → lots idempotents (`on conflict`).
- Toute **migration DB** : **proposer le diff SQL AVANT exécution**, puis rapport `.md` dans `docs/rapports/`, ajouter le fichier `supabase/migrations/…`, garder le tout idempotent.
- **Couleurs/libellés uniquement dans `lib/constants.ts`** (aucune couleur en dur). Accent rouge Assemblage `#E30513` = token `--accent`.
- **Calculs dérivés jamais stockés** (économie %, kWh/m²). **NULL = « — », jamais 0.** RLS strict (lecture `authenticated`, écriture `admin`). Dev = bypass mock admin (`NEXT_PUBLIC_DEV_AUTH_BYPASS=true`).
- **UI en espagnol (Argentine)** ; code/commentaires/échanges en **français**.
- **Méthode** : sous-lots ; **commit dédié + court récap `.md` dans `docs/rapports/`** ; **PAUSE pour validation entre sous-lots**. Vérifier la persistance **contre la base via MCP `execute_sql`**. Aperçu via le serveur de dev. **Ne jamais supprimer/écraser les données saisies par l'utilisateur** (l'app est connectée à la vraie base ; nettoyer uniquement tes propres lignes de test).

## Architecture Admin déjà en place (générique — à réutiliser)
- `lib/supabase/server.ts` : `createServiceClient()` (`server-only`, `SUPABASE_SERVICE_ROLE_KEY`).
- `lib/admin/config.ts` : config par table (`table`, `uidPrefix`, `uidPad`, `textFields`, `notNull`, `dateFields`, `flagFields`, `arrayFields`, `select`, `defaults`, `todayField`, `orderBy`). Tables : gp, entidades, equipo, eventos, capdoc, capevt.
- `lib/admin/read.ts` : `listTable(key)` (sans cache).
- `app/admin/actions.ts` : Server Actions génériques `addRow(tableKey, presets?)`, `updateField`, `setFlag`, `setArrayField`, `deleteRow` (`assertAdmin()` + `revalidatePath`). **UID généré serveur** (préfixe + max+1).
- `components/admin/editable-table.tsx` : `EditableTable` générique. Types de colonne : `text|url|select|date|time|datetime|multiselect`. Selects = dropdowns **personnalisés en portail** (badges colorés, anti-rognage). Prop `filters` (filtres par colonne). `Confidencial` (checkbox rouge) + `Publicar` (toggle neutre). Recherche client. `AdminColumn.isDisabled(row)` grise une cellule (prêt pour la règle url de gestion_lineas).
- `components/admin/admin-tabs.tsx` : hook `useAdminTable(tableKey, initial)` → `{ rows, handlers, add(presets?) }`. Onglets : Gestión de proyecto, Calendario, Equipo, Capacitaciones, Gestión de subproyectos.
- `app/admin/page.tsx` : Server Component `force-dynamic`, fetch parallèle, passe les données à `AdminTabs`.

## État (dernier commit `c73ecd6`)
- ✅ Étape 1 (schéma + RLS + seed §5), Étape 2 (charte + layout fidèle à `Capture dashboard.png`).
- ✅ 3 rôles `{admin, gestion, consultor}` (migration 003) ; champ `confidencial` (003) + `publicar` (004) sur les 5 tables documentaires (publicar SANS RLS).
- ✅ **3.1** GP · **3.2** Equipo (+ entidades) & Calendario · **3.3a** Capacitaciones (documentos + eventos, subdivisions EE/AyS/G).

## À FAIRE — reprendre au sous-lot 3.3b
**1. Gestión de subproyectos (CDC §4.5).** UI par **sélecteur de sous-projet** (9, groupés Aeropuertos / Hospitales / Escuelas ; + ajouter une école). Par sous-projet, 4 sections :
   - **Datos del edificio** : édition de la ligne `subproyectos` (tipologia [badge], direccion, lat, lng, superficie_m2). Édition par champ (pas une table « liste »).
   - **Datos de la faisabilidad** : `metricas` (escenario=`faisabilidad`) + bénéficiaires.
   - **Datos de proyecto** : `metricas` (escenario=`proyecto`), sans bénéficiaires.
   - **Gestión del subproyecto** : `gestion_lineas` (EditableTable filtrée par `subproyecto_uid`) — `titulo`, `orden` (**drag & drop**, nouvelle interaction à coder), `tipo_linea` (Documento/Etapa), `componente`, `url` (**grisé si `tipo_linea ≠ documento`** → via `isDisabled`), `estado`, `fecha`, `fase`. Bouton +. (Seed déjà : Auditoria / Planos pdf / Proyecto ejecutivo / Pliego par sous-projet.)
   > `subproyectos` et `metricas` ne sont pas des tables « liste » plates → prévoir un composant d'édition par champ (formulaire) ; `gestion_lineas` réutilise `EditableTable`.

**2. Nettoyage des UID orphelins** dans les `text[]` : à la suppression d'une persona (`equipo`) → retirer son `uid` des `participantes[]` de `eventos` et `capacitaciones_eventos` ; à la suppression d'une entidad → retirer des `entidades[]` de `capacitaciones_eventos` **et** mettre `equipo.entidad_uid = NULL`. (Via `array_remove` en SQL/RPC, ou fetch+filter+update, dans `deleteRow` ou des actions dédiées.)

**3. (Option)** `documento_uid` (capevt) limité aux documents de la **même subsección** (filtrage d'options par ligne — non supporté actuellement par `EditableTable`).

## Ensuite (étapes suivantes)
- **Étape 4** : Inicio (dashboard) + Mapa (OpenStreetMap, marqueurs par typologie, card avec réduction %). Implémenter l'endpoint **`/api/snapshot`** en `service_role` côté serveur (cacheable, `stale-while-revalidate`) pour la **lecture publique** — distinct de l'Admin. Réf visuelle : `Capture dashboard.png`. ⚠️ Affiner la coord. de SUB-CENTENARIO si besoin (déjà OSM W190050427).
- **Étape 5** : PWA offline en lecture (cache shell + dernier snapshot ; bannière « Sin conexión — solo lectura »).
- **Étape 6** : Auth Supabase réelle + RLS productif + gestion des rôles (page Roles) ; créer le 1ᵉʳ admin dans `peebcoolsf_perfiles` ; activer *leaked password protection*.

## Démarrage
Confirme d'abord le plan du **3.3b** (UI Gestión de subproyectos : sélecteur + 4 sections, drag & drop, règle url, nettoyage orphelins), propose l'approche, puis **pause** pour validation avant de coder.
