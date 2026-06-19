# Récap — Étape 3.1 (Ossature Admin + composant de ligne éditable)

> **Date :** 2026-06-19 · **Statut : ✅ livré, en attente de validation ergonomie.** Build vert.
> Démo sur **Documentation GP** avec **données locales** (persistance réelle branchée après config `service_role`).

---

## Livré
- **Page Admin** avec les **5 onglets §4.4** : *Gestión de proyecto* (actif) · *Calendario* · *Equipo* · *Capacitaciones* · *Gestión de subproyectos*. Onglets vides sauf GP. Garde admin-only (`isAdmin`) ; en dev, mock admin → visible.
- **Composant réutilisable `EditableTable`** (style Airtable), piloté par une config de colonnes :
  - **Édition inline** cellule par cellule (clic → champ ; Entrée/blur = valider ; Échap = annuler).
  - **Checkbox « Confidencial » rouge** (`accent-color: var(--accent)` = `#E30513`), 1ʳᵉ colonne — uniquement si `showConfidencial` (les 5 tables §4.4).
  - **UID visible + bouton copier** (presse-papier) par ligne.
  - **Suppression** de ligne (corbeille) ; **ajout** optionnel (`onAdd`, prévu pour gestion_lineas).
  - **Champ désactivable conditionnellement** (`isDisabled(row)`) → prêt pour la règle « URL grisé si `tipo_linea` ≠ Documento » (§ gestion_lineas, 3.3).
- Onglet GP : section *Documentación de proyecto* (table éditable, 6 lignes du seed) + section *Gestión financiera* (placeholder, structure à définir §3.3).

## Approche données (confirmée, à brancher)
- **Lecture** = Server Components ; **écriture** = Server Actions ; **`service_role` côté serveur**, **sans cache**, **table par table**. Autorisation vérifiée dans chaque action (dev : mock admin ; Étape 6 : `is_admin()`/`current_rol()`).
- **Distinct** de `/api/snapshot` (cacheable, réservé dashboard Étape 4).
- **À fournir pour activer la persistance réelle** : coller `SUPABASE_SERVICE_ROLE_KEY` dans `.env.local` (Supabase → Project Settings → API → service_role). URL + clé publishable déjà renseignées.

## Vérifié
- `npm run build` : vert (0 erreur TS/lint), 7 routes.
- Édition inline : clic ouvre l'input, saisie + blur committe, la cellule affiche la nouvelle valeur (testé en page).
- Checkbox Confidencial : `accent-color = rgb(227,5,19)` (#E30513) ✅.
- Les 6 UID GP affichés et copiables.

## Respect du CDC
- UID lisibles préservés (§3.1) · `confidencial` seulement sur tables prévues (ici GP) · mécanisme URL-grisé prêt (§gestion_lineas) · aucune couleur en dur (tokens `constants.ts`) · interface **es-AR** · dev bypass mock admin.

## Fichiers
**Nouveaux** : `components/admin/editable-table.tsx`, `components/admin/copy-button.tsx`, `components/admin/admin-tabs.tsx`, `components/admin/demo-data.ts`.
**Modifiés** : `components/icons.tsx` (+ Clipboard/Check/Trash), `app/admin/page.tsx`, `.env.local` (URL + anon, gitignoré).

## Suite (après validation)
1. Brancher la **persistance réelle** sur GP (Server Components + Server Actions, service_role) une fois la clé fournie.
2. **3.2** — Equipo (+ entités) & Calendario.
3. **3.3** — Capacitaciones & Gestión de subproyectos (drag & drop, +), nettoyage UID orphelins.
