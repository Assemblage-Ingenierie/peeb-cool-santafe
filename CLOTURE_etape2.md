# Clôture — Étape 2 (Charte + Layout)

> **Date :** 2026-06-19 · **Statut : ✅ Terminée.** Cadre visuel sobre et fonctionnel, fidèle à la capture de référence (`Capture dashboard.png`). Interface en espagnol (es-AR). Build vert, 0 erreur console.
>
> **Commits :**
> - [`791275f`](https://github.com/mbhoyroo/peeb-cool-santafe/commit/791275f) — charte + layout initial
> - [`3d25800`](https://github.com/mbhoyroo/peeb-cool-santafe/commit/3d25800) — alignement capture + « Filtrar » + 3 rôles
> *(La migration 3 rôles + confidentialité côté DB = [`50ad30c`](https://github.com/mbhoyroo/peeb-cool-santafe/commit/50ad30c), Partie A.)*

---

## Ce qui est en place

### `lib/constants.ts` — source unique
- Composantes (CDC §2.3) : `GP #30323e` (texte clair), `EE #fff2cc`, `AyS #d9ead3`, `G #d9d2e9` (texte foncé), avec `textoClaro`/`onColor`.
- Typologies (CDC §2.4) : `A #990000`, `H #cc0000`, `E #3c78d8` (texte clair).
- **Greys neutres centralisés** (tokens UI : fond `#f3f4f6`, surface, bordures, texte) exposés en variables CSS sur `<body>`. Aucune couleur en dur ailleurs.

### Layout (fidèle à la capture)
- **Sidebar `#30323e`** : logo Assemblage (haut), navigation à icônes, filigrane « .A » (bas droite, 6 %), pied = **nom + rôle + bouton déconnexion**.
- **Header blanc** : logos **AFD + Provincia de Santa Fe** à gauche ; à droite, libellé **« Filtrar »** + **4 boutons GP/EE/AyS/G** remplis de leur couleur (comme la capture).
- **Fond gris clair**, contenu en cartes blanches.

### Boutons de filtre composante (CDC §2.1)
- **Fixes et persistants** dans le header sur **toutes les pages** (présents via le shell).
- **État actif/inactif** : actif = rempli de la couleur composante ; inactif = neutre + pastille de couleur. `aria-pressed` géré.
- **Actifs par défaut** (= aucune restriction), comme la capture.
- ⚠️ **L'effet du filtre sur le contenu n'est pas encore implémenté** (cadre uniquement, conforme à la consigne).

### Navigation (pages = coquilles vides)
- **Inicio · Mapa · Calendario · Capacitaciones · Admin · Gestión de roles**.
- **Admin** et **Gestión de roles** réservés à `admin` (en dev, bypass mock admin → visibles). `lib/auth.ts` gère les **3 rôles** {admin, gestion, consultor} ; la visibilité par rôle gestion/consultor sera affinée plus tard.

### Qualité d'exécution
- Police **système** (perf, CDC §6) · **responsive** (sidebar persistante ≥1024 px / tiroir mobile + backdrop) · **focus clavier** visible · **`prefers-reduced-motion`** respecté · spacing régulier, libellés espagnols cohérents.

---

## Rendu vérifié (build + inspection DOM + captures)
- Build : 7 routes, **0 erreur TS / lint**. Console navigateur : **0 erreur**.
- Sidebar = `rgb(48,50,62)` (#30323e), desktop `sticky` 248 px ; mobile hors-écran + hamburger.
- Bouton filtre GP = `rgb(48,50,62)` / texte blanc (actif) ✅ ; EE/AyS/G = couleurs pâles.
- `main` = 1017 px à 1280 (remplit la colonne, pas de bug de layout).
- Captures : desktop (sidebar + header + Filtrar + boutons colorés) et mobile (filtres repliés, « Filtrar » masqué) conformes. *(Rond « N » = indicateur dev Next.js, absent en prod.)*

---

## Fichiers créés / modifiés (Étape 2)
**Nouveaux** : `lib/constants.ts`, `lib/auth.ts`, `lib/nav.ts`, `lib/cn.ts` ; `components/{app-shell,sidebar,header,component-filters,logo-slot,icons,page-placeholder}.tsx` ; pages `app/{mapa,calendario,capacitaciones,admin,roles}/page.tsx` ; `Capture dashboard.png`.
**Modifiés** : `app/layout.tsx`, `app/globals.css`, `app/page.tsx`, `lib/auth.ts` (3 rôles), `components/component-filters.tsx` (Filtrar), `components/app-shell.tsx` (filtres actifs par défaut).
**Supprimés** : placeholders `public/logos/*.svg` ; doublon `logo_Ai_rouge_HD.png`.

## Logos — en place (`public/logos/`, PNG)
`assemblage.png` (sidebar) · `assemblage-a.png` (filigrane) · `afd.png` · `santafe.png`. Transparence OK pour les 2 Assemblage. Fallback placeholder pointillé conservé (composant `LogoSlot`) si un fichier manque.

---

## Écarts signalés
1. **Surbrillance de l'item de nav actif** gardée **neutre** (fond blanc translucide + barre claire), pas le rouge de la capture — pour respecter la palette fixée (le rouge Assemblage n'est pas un token défini). À ajuster si tu veux le rouge.
2. **Contenu du dashboard** de la capture (Agenda, tableau sous-projets, carte OSM, zone basse Datos/Documentos/Progreso) = **Étape 4** ; ici seul le **cadre** est posé (pages en coquilles).
3. `CAHIER_DES_CHARGES_FR.pdf` (ajouté au dossier) laissé **non versionné** — dis-moi si tu veux le committer.

## Prochaine étape
**Étape 3 — Admin (CRUD)** : onglets §4.4 (Gestion de proyecto, Calendario, Equipo, Capacitaciones, Subproyectos), UID visibles/copiables, **checkbox rouge « Confidencial »** par ligne sur les 5 tables, nettoyage des UID orphelins dans les `text[]`. Lecture en dev via `/api/snapshot` `service_role`.
