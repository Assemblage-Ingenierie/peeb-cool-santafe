# Prompt de reprise — Étape 4 (Inicio Dashboard + Mapa + /api/snapshot)

> À coller dans une nouvelle session de Claude Code, **dans le dossier du repo** `C:\Users\maelb\github\PEEB Santa Fe`. La mémoire projet et `CLAUDE.md` se chargent automatiquement.

---

Tu reprends le développement de **PEEB Cool — Santa Fe** (app web PWA de suivi, Assemblage ingénierie / AFD / Province de Santa Fe).

**Avant de coder, lis :** `CAHIER_DES_CHARGES_FR.md` (surtout **§4.1 Inicio**, **§4.2 Mapa**, **§6 Optimisation**), la **mémoire projet** (auto-chargée), et les derniers récaps dans `docs/rapports/` — surtout `RAPPORT_etape3-3b_gestion_restructure.md` et `RAPPORT_revue_3-3b.md`. **Référence visuelle du dashboard : `Capture dashboard.png`** (racine repo). C'est un **Next.js 16** (ruptures d'API) : lis `AGENTS.md` + les guides `node_modules/next/dist/docs/` avant d'écrire du code (notamment **Route Handlers**, **caching/`revalidate`**, Server Components).

## Règles impératives (ne pas dévier)
- **Supabase via le connecteur MCP uniquement**, jamais la CLI. **`execute_sql` en dev, JAMAIS `apply_migration`.** Projet **EXTERNAL** id `grnkbnldfzdzrgleorra`. Tables préfixées **`peebcoolsf_`**. Fonctions SECURITY DEFINER dans `peebcoolsf_private` (`search_path=''`). `execute_sql` non atomique → lots idempotents (`on conflict`).
- Toute **migration DB** : **proposer le diff SQL AVANT exécution**, puis rapport `.md` dans `docs/rapports/` + fichier `supabase/migrations/`. *(L'Étape 4 ne devrait nécessiter aucune migration — lecture seule.)*
- **Couleurs/libellés uniquement dans `lib/constants.ts`** (aucune couleur en dur). Accent rouge Assemblage `#E30513` = token `--accent`. Typologies A/H/E et composantes GP/EE/AyS/G : couleurs dans `constants.ts`.
- **Calculs dérivés JAMAIS stockés** (économie kWh, %, kWh/m²) → calculés à l'affichage depuis `demanda_kwh`, `demanda_despues_kwh`, `superficie_m2`. **NULL = « — », jamais 0.**
- RLS strict (lecture `authenticated`, écriture `admin`). **Dev = mock admin** (`NEXT_PUBLIC_DEV_AUTH_BYPASS=true`). ⚠️ Le navigateur en dev (rôle `anon`) **ne lit pas en direct** → toute lecture dashboard/mapa passe par **`/api/snapshot`** en `service_role`.
- **UI en espagnol (Argentine)** ; code/commentaires/échanges en **français**.
- **Méthode** : sous-lots ; **commit dédié + court récap `.md` dans `docs/rapports/`** ; **PAUSE pour validation entre sous-lots**. Vérifier lecture/persistance **contre la base via MCP**. Aperçu via le serveur de dev (`preview_*`). **Ne jamais toucher aux données réelles saisies par l'utilisateur** — nettoyer uniquement tes propres lignes de test.

## État (dernier commit `578d7e4`, branche `main`)
- ✅ **Étapes 1, 2, 3 TERMINÉES.** Étape 3 = Admin CRUD complet (5 onglets : Gestión de proyecto, Calendario, Equipo, Capacitaciones, **Gestión de subproyectos** avec sous-sections **Documentos / Fases**).
- **DB réelle (vérifiée)** : **9 subproyectos** · **18 metricas** (9×2, escenarios `faisabilidad`/`proyecto`) · gestion_lineas = **36 documents + 72 fases** (9×8) · **8 fases** de référence · eventos/equipo/entidades = **données utilisateur réelles** (ne pas toucher). 0 ligne de test.
- **3 rôles** {admin, gestion, consultor}. `confidencial` (accès/RLS) + `publicar` (affichage public) sur les tables documentaires. `subproyectos.notas` = HTML restreint (gras + rouge).
- `next build` vert ; advisors Supabase sans alerte sur le schéma `peebcoolsf_`.

## Architecture en place (à réutiliser pour l'Étape 4)
- **`lib/supabase/server.ts`** : `createServiceClient()` (`server-only`, `SUPABASE_SERVICE_ROLE_KEY`) → **à utiliser dans `/api/snapshot`**.
- **`lib/constants.ts`** : `COMPONENTES` / `TIPOLOGIAS` (code, nombre, color, onColor) + `getComponente()` / `getTipologia()` + `ESTADOS` / `FASES`. Source unique des couleurs.
- **`components/app-shell.tsx`** (client) détient l'**état des filtres composante** (`Set<string>`, **tous actifs par défaut**) → `Header` → `components/component-filters.tsx` (boutons GP/EE/AyS/G). ⚠️ **L'état n'est PAS transmis au contenu des pages (`children`)** : pour filtrer le dashboard/mapa il faudra **partager cet état** (Context React ou search params) — **décision à proposer**.
- **Pages = coquilles** : `app/page.tsx` (**Inicio = `/`**) et `app/mapa/page.tsx` rendent un `PagePlaceholder` → à remplacer. `components/page-placeholder.tsx` à remplacer/garder selon besoin.
- **Données utiles** : `subproyectos` (uid, nombre, tipologia, seccion, orden, direccion, lat, lng, superficie_m2, notas) · `metricas` (par subproyecto × escenario : demanda_kwh, demanda_despues_kwh, gei_*, costo_*, benef_* sur faisabilidad) · `eventos` (nombre, fecha, hora_inicio/fin, participantes [equipo|entidades], componente, modalidad, lugar, url_conexion).

## À FAIRE — Étape 4 (découper en sous-lots, PAUSE entre chaque)

**Sous-lot 4.0 — `/api/snapshot` (À FAIRE EN PREMIER : socle de tout le reste)**
- `app/api/snapshot/route.ts` (lis la doc Next 16 Route Handlers + caching) : lit en **`service_role`** et renvoie le JSON nécessaire au dashboard + à la carte : `subproyectos` + `metricas` + `eventos` (+ résolution des labels participantes equipo/entidades pour l'Agenda si utile).
- **Cache `stale-while-revalidate`** (CDC §6), **un seul endpoint**, sans polling. **Ne jamais exposer la `service_role` au client.**
- **`lib/calc.ts`** (nouveau) : helpers de calculs dérivés (`economiaKwh`, `economiaPct`, `kwhPorM2`) — jamais stockés ; renvoient `null` si donnée manquante (affiché « — »).

**Sous-lot 4.1 — Inicio / Dashboard** (réf. `Capture dashboard.png`)
- **Filtres composante** : brancher l'état du header au contenu (voir décision Context/URL).
- **Agenda** : cartes des prochains événements (nom, date/heure, entités/participants, lieu) avec la couleur de la composante.
- **Sélecteur de sous-projets** (Todos / Aeropuertos / Hospitales / Escuelas) + liste.
- **Tableau central** par sous-projet (placeholder pour l'instant).
- **Carte OSM** intégrée (encart de droite).
- **Zone basse** (fond foncé) : blocs Datos / Documentos / Progreso → **placeholders** (contenu détaillé = 2ᵉ phase, CDC §8).

**Sous-lot 4.2 — Mapa**
- Carte **OpenStreetMap, tuiles directes OSM** (sans egress propre). **Décision à proposer : librairie carte** (Leaflet/react-leaflet vs alternative plus légère — contrainte free-tier / PWA légère) + attribution OSM.
- Marqueurs aux coordonnées de chaque sous-projet, **couleur = typologie** (A/H/E).
- Au clic → **card** : consommations théoriques avant/après (kWh **et** kWh/m²), réduction (kWh **et %**) ; la **réduction en % est resaltée** (mise en valeur).

**Décisions à proposer au démarrage** : (1) **librairie carte** ; (2) **partage de l'état des filtres** (Context vs search params) ; (3) **forme exacte du JSON `/api/snapshot`**. *(Le filtrage public par `confidencial`/`publicar` concerne surtout les pages documentaires ; en dev le snapshot lit tout en service_role.)*

## Ensuite (étapes suivantes)
- **Étape 5** : PWA offline (lecture) — cacher le shell + le dernier `/api/snapshot` ; bannière « Sin conexión — solo lectura » ; écriture désactivée hors-ligne.
- **Étape 6** : Auth Supabase réelle + RLS productif + page **Roles** + 1ᵉʳ admin dans `peebcoolsf_perfiles` + **activer leaked password protection** + optimiser `multiple_permissive_policies` (motif sel+admin). *(Items reportés notés dans `RAPPORT_revue_3-3b.md`.)*

## Démarrage
Lis le CDC (§4.1/§4.2/§6) + la mémoire + `Capture dashboard.png`, **confirme le plan du sous-lot 4.0** (forme du `/api/snapshot` + helpers `lib/calc.ts`), **propose l'approche** (et les 3 décisions ci-dessus), **puis PAUSE** pour validation avant de coder.
