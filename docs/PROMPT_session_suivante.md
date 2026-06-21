# Prompt de reprise — Ajustes post-Étape 4 : **S3 (interface mesures)** + **S4 (Inicio mesures)**

> À coller dans une nouvelle session de Claude Code, **dans le dossier du repo** `C:\Users\maelb\github\PEEB Santa Fe`. La mémoire projet et `CLAUDE.md` se chargent automatiquement.

---

Tu reprends le développement de **PEEB Cool — Santa Fe** (app web PWA de suivi, Assemblage ingénierie / AFD / Province de Santa Fe).

**Avant de coder, lis :** `CAHIER_DES_CHARGES_FR.md` (surtout **§4.1 Inicio**, **§4.3 Calendario**, **§4.4 Admin**, **§4.5 Gestion de subproyectos**), la **mémoire projet** (auto-chargée), et les derniers récaps dans `docs/rapports/` — surtout `RAPPORT_S1-S2_uid_formaciones.md` et les `RAPPORT_etape4-*`. **Référence visuelle : `Capture dashboard V2.png`** (racine repo). C'est un **Next.js 16** (ruptures d'API) : lis `AGENTS.md` + les guides `node_modules/next/dist/docs/` avant d'écrire du code.

## Règles impératives (ne pas dévier)
- **Supabase via le connecteur MCP uniquement**, jamais la CLI. **`execute_sql` en dev, JAMAIS `apply_migration`.** Projet **EXTERNAL** id `grnkbnldfzdzrgleorra`. Tables préfixées **`peebcoolsf_`**. Fonctions SECURITY DEFINER dans `peebcoolsf_private` (`is_admin()`, `search_path=''`). `execute_sql` non atomique → lots idempotents.
- Toute **migration DB** : **proposer le diff SQL AVANT exécution**, puis rapport `.md` dans `docs/rapports/` + fichier `supabase/migrations/` (dernier numéro = **010**). RLS d'une nouvelle table = motif `_sel` (select authenticated, `using (true)`) + `_admin` (`for all` via `using ((select peebcoolsf_private.is_admin()))`).
- **Couleurs/libellés uniquement dans `lib/constants.ts`** (aucune couleur en dur). Accent rouge Assemblage `#E30513` = `--accent`. Composantes : EE `#fff2cc` (jaune), G `#d9d2e9` (violet), AyS `#d9ead3` (vert), GP `#30323e`.
- **Calculs dérivés JAMAIS stockés** → `lib/calc.ts` (`economiaKwh`/`economiaPct`/`kwhPorM2`/`porM2`/`suma`). **NULL = « — », jamais 0** (`lib/format.ts` : `fmtNumero`/`fmtPct`/`GUION`).
- Lecture dashboard/mapa = **`/api/snapshot`** en `service_role` (jamais exposée au client). Dev = mock admin (`NEXT_PUBLIC_DEV_AUTH_BYPASS=true`).
- **UI en espagnol (Argentine)** ; code/commentaires/échanges en **français**. **Communication SANS jargon** (cf. mémoire `feedback-communication-sans-jargon`) : trancher soi-même les détails techniques, expliquer en clair, ne demander que les vrais choix métier/UX.
- **Méthode** : sous-lots ; **commit dédié + court récap `.md` dans `docs/rapports/`** ; **PAUSE entre sous-lots**. Vérifier contre la base via MCP. **Ne jamais toucher aux données réelles de l'utilisateur.**

## État (branche `main`)
- ✅ **Étapes 1–3** (schéma+RLS+seed ; charte+layout ; Admin CRUD). ✅ **Étape 4** (Inicio + Mapa + `/api/snapshot`) : 4.0 socle ; 4.1 dashboard (Agenda scrollable, ligne **Gestión** global/subproyectos, panneau central, carte de sélection) ; 4.2 **Mapa** (carte plein écran, filtre typologie, case % de réduction, card + toggle factibilidad/proyecto) ; 4.3 **Proyecto global** (grand tableau « Resumen » + 3 blocs).
- 🔧 **Ajustes post-Étape 4 (lot S1–S4, EN COURS)** :
  - ✅ **S1** (commit `da288b4`) : UID en **1ʳᵉ colonne, minimes** (`text-[10px]`, gris, opacité réduite), **sans bouton copier** (`EditableTable` ; `copy-button.tsx` supprimé).
  - ✅ **S2** (commit `56ac38d`, **migration 009**) : sous-section « eventos » de **Capacitaciones supprimée** (table `capacitaciones_eventos` **droppée**) ; sur le **Calendario** (`eventos`), champs **`formacion`** (case — type de colonne `checkbox` ajouté à EditableTable) + **`url_documento`**. Capacitaciones garde **Documentos**.
  - ✅ **S3 — base de données** (commit `fc2d77b`, **migration 010**) : table **`peebcoolsf_medidas`** créée + pré-remplie **81 lignes (9 mesures × 9 sous-projets)**, RLS active. Colonnes : `subproyecto_uid`, `medida` (code), `componente` (FK), `activa` (bool), `texto`, `kwh_anual` (numeric), `orden`. Codes : `aislacion`/`carpinterias`/`hvac`/`luminarias`/`fotovoltaicos`/`solar_termica` (EE), `genero` (G), `otras` (∅), `ays` (AyS).
  - ⏳ **S3 — interface** + ⏳ **S4** : **À FAIRE** (voir ci-dessous).
- **DB (vérifiée)** : 9 subproyectos · 18 metricas (proyecto = vide, faisabilidad = 9/9) · 72 fases · 36 gestion documentos · `eventos` (+`formacion` +`url_documento`) · `documentacion_gp` (+`componente`) · **`medidas` 81** · `capacitaciones_documentos` 9 · `capacitaciones_eventos` **n'existe plus**.

## Architecture en place (à réutiliser)
- **`lib/snapshot.ts`** (`server-only`, `getSnapshot()`) → `subproyectos, metricas, fases, documentos, docsProyecto, eventos`. **`app/api/snapshot/route.ts`** (cache SWR).
- **`lib/constants.ts`** : `COMPONENTES`/`TIPOLOGIAS`/`FASES`/`ESTADOS`/`UI` + `getComponente`/`getTipologia`. **(À enrichir d'un `MEDIDAS`.)**
- **Dashboard** `components/dashboard/` : `dashboard-client` (orchestre ; mode global/subproyectos), `agenda`, `seguimiento-panel`, `subproyectos-map` (react-leaflet ; props `wheelZoom`/`renderPopup`/`renderTooltip`/`initialBounds`), `global-table` (Resumen), `global-blocks` (3 blocs mode global), `bottom-band` (3 blocs mode subproyectos — **c'est ici qu'iront les blocs Medidas**), `datos-card` (réutilisable), `use-escenario`, `use-snapshot`.
- **Admin** `components/admin/` : `admin-tabs`, `editable-table` (types text/url/select/date/time/datetime/multiselect/**checkbox** ; UID 1ʳᵉ col discrète), `subproyectos-panel` (**Gestión de subproyectos** : Datos del edificio / factibilidad / **Datos de proyecto** / Gestión — **c'est ici qu'ira l'éditeur de mesures**), `field-editor`. Config `lib/admin/config.ts` ; lecture `lib/admin/read.ts` (`listTable`/`listSubproyectos`/`listMetricas`) ; actions `app/admin/actions.ts` (`addRow`/`updateField`/`setFlag`/`setArrayField`/`deleteRow` + dédiées `updateSubproyecto`/`updateMetrica`/…).

## À FAIRE — découper en sous-lots, PAUSE entre chaque

### S3 (interface) — Mesures dans Admin → Gestión de subproyectos → **Datos de proyecto**
1. **`lib/constants.ts`** : ajouter `MEDIDAS` (code, label es, `componente` EE/G/null/AyS, `color` du logo, `tieneKwh`). Couleurs depuis la palette : 4 EE **jaunes** (`#fff2cc`) ; `fotovoltaicos`+`solar_termica` **bleus** (définir un token bleu, p.ex. `#3c78d8`) ; `genero` **violet** (`#d9d2e9`) ; `otras` **gris** ; `ays` **vert** (`#d9ead3`).
2. **Pictogrammes SVG maison** (décision validée) : un par mesure (aislación, carpinterías, HVAC, luminarias, photovoltaïque, solaire thermique, **bâtiment** pour *otras*). **Género** et **AyS** = badges lettre « G » / « AyS » colorés (pas d'icône). Composant type `components/icons/medida-icons.tsx`.
3. **Lecture** : `lib/admin/read.ts` → `listMedidas()`. `app/admin/page.tsx` → charger + passer à `SubproyectosPanel`.
4. **Éditeur** dans `subproyectos-panel.tsx` (sous-section **Datos de proyecto**) : par mesure (ordre `orden`), ligne = **logo + label + case `activa` + texte libre + champ kWh/an** (kWh masqué pour AyS). Style cohérent avec `FieldEditor`.
5. **Actions** : `app/admin/actions.ts` → `updateMedida(subproyectoUid, medida, field, value)` (toggle `activa` / `texto` / `kwh_anual` ; `assertAdmin` + `revalidatePath`).

### S4 — Inicio (mode **Subproyectos**, un bâtiment sélectionné)
1. **`lib/snapshot.ts`** : ajouter **`medidas`** au snapshot (lecture `peebcoolsf_medidas`).
2. **Bloc Datos** (`bottom-band.tsx`) : en **haut à droite**, les **logos des mesures cochées** (`activa`) du sous-projet.
3. Sous les 3 blocs : **Medidas EE**, **Medidas género**, **Otras medidas** (logo + label + texte + kWh/an des mesures cochées), **Especificidades AyS** (texte, sans kWh).

### Reporté (sur décision user)
- Contenu du **3ᵉ bloc** du mode Proyecto global.
- **Câblage des 4 filtres GP/EE/AyS/G** du header (filtreront Agenda + sections Documentos).
- **Étape 5** : PWA offline (cacher shell + dernier `/api/snapshot` ; bannière « Sin conexión — solo lectura »).
- **Étape 6** : Auth Supabase réelle + RLS productif + page Roles + leaked password protection.

## Démarrage
Lis le CDC (§4.1/§4.3/§4.4/§4.5) + la mémoire + `Capture dashboard V2.png`. **Confirme le plan du sous-lot S3 (interface)** — surtout l'approche des **pictogrammes SVG** et l'emplacement de l'éditeur dans *Datos de proyecto* — **puis PAUSE** pour validation avant de coder. Serveur de dev : `npm run dev` (port 3000) ; aperçu via `preview_*` (si la capture d'écran échoue, vérifier via le DOM / `/api/snapshot`).
