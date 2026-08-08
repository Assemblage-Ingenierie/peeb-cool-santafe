@AGENTS.md

# PEEB Cool — Santa Fe

Application web de suivi de projet (PWA) — réhabilitation énergétique de bâtiments publics, Province de Santa Fe, Argentine.

## Stack
- Next.js (App Router, TypeScript) + Tailwind CSS
- Supabase (PostgreSQL + RLS + Auth)
- Déploiement Vercel (free-tier)

## Langue
- Interface utilisateur : **espagnol (Argentine)**
- Code, commentaires, échanges : **français**

## Règles importantes
- Toutes les couleurs et libellés de composantes/typologies sont dans `lib/constants.ts`
- Les calculs dérivés (économie kWh, %, kWh/m²) ne sont JAMAIS stockés en DB — calculés à l'affichage
- Calculs dérivés dans `lib/calc.ts` ; formatage d'affichage dans `lib/format.ts`
- Données manquantes = NULL → afficher « — », jamais 0 (milliers en espace insécable)
- RLS actif sur toutes les tables dès le départ
- En dev : bypass auth via `NEXT_PUBLIC_DEV_AUTH_BYPASS=true`
- Documents volumineux = liens externes (champ URL), jamais Supabase Storage

## Supabase (IMPÉRATIF)
- Accès **via le connecteur MCP Supabase uniquement**, jamais la CLI.
- **`execute_sql` en phase dev — JAMAIS `apply_migration`** (pas d'écriture dans l'historique à chaque appel).
- Projet **EXTERNAL** id `grnkbnldfzdzrgleorra` (org Assemblage Ingenierie). Plan gratuit 2 projets (EXTERNAL clients/partenaires, INTERNAL interne).
- Projet partagé → **toutes les tables préfixées `peebcoolsf_`** (une autre app utilise déjà `peeb_` + buildings/app_params/profiles : ne pas y toucher).
- Fonctions `SECURITY DEFINER` dans le schéma privé `peebcoolsf_private` (`is_admin()`, `set_updated_at()`), `search_path=''`.
- `execute_sql` n'est PAS atomique multi-statements → découper en lots, vérifier l'état après un éventuel timeout, inserts idempotents (`on conflict`).
- Lecture publique : via endpoint serveur `/api/snapshot` (`lib/snapshot.ts`, `service_role`, jamais exposée au client ; cache SWR ~60 s). Filtre `publicar=true` à la source pour les documents. Hook client `use-snapshot.ts` (`refreshKey` pour recharger après écriture).

## Conventions UID
- Sous-projets : SUB-AIR, SUB-ASV, SUB-CENTENARIO, SUB-CULLEN, SUB-E67, SUB-E407, SUB-E574, SUB-E1109, SUB-E331, puis SUB-ESC-NNN (écoles ajoutées ensuite — les 18 du périmètre = SUB-ESC-001…018, migration 031). UID **internes** : jamais affichés ni saisis dans l'UI.
- Équipe : EQ-001, EQ-002, …
- Entités : ENT-001, …
- Événements : EVT-0001, …
- Documentation GP : GP-DOC-MANUAL, GP-DOC-PAC, GP-DOC-MV, GP-DOC-PRESUP, GP-DOC-INI, GP-DOC-PER1, …
- Capacitaciones : CAP-EE-01, CAP-AYS-01, CAP-G-01, … (documents) | CAPEVT-… (événements)
- Gestion sous-projet : GEST-<SUB_CODE>-<n>, ex. GEST-AIR-0001

## État de développement
1. ✅ Schéma DB + RLS + seed
2. ✅ Charte + layout (sidebar, header, constantes couleur)
3. ✅ Admin (CRUD par table + UID générés serveur)
4. ✅ Inicio (Dashboard) + Mapa
5. ✅ Calendario (vue mensuelle, fuseau AR/FR, CRUD événements pour tous + alerte « +N »)
6. ✅ Requisitos AyS (checklist MGAS dédiée — n'est plus une « medida »)
7. ✅ Hojas de ruta (feuille de route interactive : phases verticales, cartes par composante, contenu AyS + cartes dynamiques par plan ; édition admin realizada/comentario/editar/enlazar + case ANO AFD ; persistance DB)
   - ⚠ La feuille **« Proyecto global » ne suit plus ce format** : c'est désormais
     « Próximas tareas » (`lib/agenda.ts` + `components/hojas-de-ruta/agenda-global.tsx`).
     On part de la barre « hoy » : les tâches qu'elle **traverse** sont « en curso »,
     celles qui **démarrent** ensuite vont dans 15 jours / 1 mois / 2 mois (fenêtres
     **exclusives**). Le démarrage d'une phase compte comme une tâche.
   - **Ne stocke rien** : `lib/agenda.ts` rejoue `computeSchedule` sur les 27 sous-projets
     + la feuille globale. C'est obligatoire — la plupart des dates de démarrage
     n'existent pas en base, elles se déduisent des ancres, durées et liaisons.
   - ⚠ La feuille **« Implementación del PAG »** ne suit pas non plus ce format :
     voir la section « Implementación del PAG » plus bas.
8. ⏳ PWA offline (lecture)
9. ✅ Auth Supabase + RLS productif + gestion des rôles

## Auth (Étape 9)
- **`@supabase/ssr`** : client navigateur (`lib/supabase/client.ts`), client serveur
  cookie-bound (`lib/supabase/server.ts` → `createServerSupabase`), refresh session +
  protection des routes dans **`proxy.ts`** (Next 16 = ex-middleware) via
  `lib/supabase/proxy.ts`. **Plus de `service_role` dans l'app** : tout passe par la
  clé anon + session → la RLS s'applique par utilisateur.
- Utilisateur courant : `getCurrentUser()` (async, server-only) dans `lib/auth-server.ts`
  (session + rôle depuis `peebcoolsf_perfiles.status`). Côté client : `useAuthUser()`
  (`components/auth-context.tsx`), alimenté par `app/layout.tsx`.
- Login : `app/login/page.tsx` (email + mot de passe). Comptes créés dans Supabase Auth
  + ligne `peebcoolsf_perfiles` (`id` = uid auth, `status`). `NEXT_PUBLIC_DEV_AUTH_BYPASS` = dev only.
- **`peebcoolsf_perfiles` est au format de la table `profiles`** (migration 026) : colonnes
  `id` (PK = uid auth), `email`, `first_name`, `last_name`, `job_title`, `status`
  (rôle : admin/gestion/consultor), `is_approved`, `is_rejected`, `created_at`,
  `requested_status`. `is_admin()`/`current_rol()` lisent `id`/`status`.
- Écriture d'événements (calendario) : RLS `eventos_admin` = **admin only** (la garde
  applicative laisse passer tout authentifié, mais la RLS reste le rempart).

- **⚠ URLs d'auth sur projet Supabase partagé** : la **Site URL** est unique par projet
  et appartient à **peeb-jordan**. Supabase **ignore silencieusement** `emailRedirectTo`
  si l'URL n'est pas dans la liste blanche *Auth → URL Configuration → Redirect URLs*,
  et retombe alors sur cette Site URL → les mails de peeb-santafe renvoyaient vers
  l'autre app (404). **Correctif = liste blanche uniquement, ne jamais toucher la Site
  URL.** Y ajouter tout nouveau domaine (prod, preview Vercel, localhost).
  Détail + procédure : `docs/procedures/auth-redirect-urls.md`.

- **Gestión de roles** (`/roles`, admin only) : liste des utilisateurs, approbation des
  demandes, changement de niveau (`app/roles/actions.ts` + `components/roles/roles-client.tsx`).
- **Mi cuenta** (modal depuis le pied de sidebar) : édition nombre/apellido/cargo + demande
  de montée en niveau (`components/account/my-account-modal.tsx` + `app/account/actions.ts`).
  Self-service sécurisé par migration 027 (policy self-update + garde anti-escalade +
  protection du dernier admin).

- **Provisioning auto** (migration 028, révisée par 029) : triggers
  `peebcoolsf_on_auth_user_created/updated` sur `auth.users` (fonction
  `peebcoolsf_private.handle_new_user`) → toute nouvelle inscription ou 1re connexion
  Google crée une ligne `peebcoolsf_perfiles` (`consultor`, **`is_approved=false`**).
  Noms distincts pour cohabiter avec les triggers `peeb_` de l'autre app sur `auth.users` partagé.

- **Validation d'accès obligatoire** (migration 029) : `is_approved` vaut `false` par
  défaut → « Pendiente de validación ». Tant qu'un admin n'a pas approuvé :
  - l'app rend `components/pending-approval.tsx` à la place de l'`AppShell`
    (choix fait dans `app/layout.tsx` via `isPendiente()` — pas de redirection,
    donc aucune boucle possible) ;
  - la RLS refuse toute donnée métier : policy **restrictive** `req_aprobacion`
    (`peebcoolsf_private.is_approved()`) sur les 20 tables `peebcoolsf_*` **sauf
    `peebcoolsf_perfiles`** (l'utilisateur doit lire sa propre ligne).
    Toute nouvelle table métier doit recevoir cette policy dans sa migration.
  - `/roles` : section « Solicitudes de acceso » + colonne « Estado » ;
    `adminApproveAccess()` / `adminRevokeAccess()` dans `app/roles/actions.ts`.
  - Colonne « Gestión de acceso » = bascule **Sí / No** (`AccesoToggle`) : « No »
    couvre refus ET révocation. Désactivée sur sa propre ligne.
    Vert `--ok` (= vert AyS `#38761d`, `lib/constants.ts`) pour « Sí », rouge de
    marque pour « No » — ne jamais signaler une approbation en rouge.
  - `protect_last_admin` étendu à `is_approved` (révoquer le dernier admin actif
    est bloqué) ; un admin ne peut pas révoquer son propre accès.

- **Acceso rechazado** (migration 030) : `is_rejected` distingue « refusé » de
  « jamais traité » (les deux ont `is_approved = false`). **Aucun effet sur les droits**
  (le rempart reste `is_approved`) : sert au classement dans `/roles`, où les comptes
  refusés sortent du tableau principal vers un `<details>` repliable
  « Accesos rechazados ». Figé par `guard_self_update` pour les non-admins.

## Implementación del PAG (feuille `pag`)
- **Catalogue dans le code** : `lib/pag.ts` — 33 acciones, 7 cadenas, 6 ejes, 8 hitos,
  remplissages par responsable. Source unique du Cronograma ET des Hojas de ruta.
  Sur les 49 acciones du fichier « Hoja de ruta PAG detallada », seules celles qui
  se traitent **une seule fois** y figurent :
  - `ambito: "gob"` (18) — gouvernance, une occurrence datée ;
  - `ambito: "una-vez"` (15) — destinées aux sous-projets mais **produites une fois** ;
    `aplicaFase` nomme la phase où le livrable sera utilisé. C'est un **renvoi**,
    jamais une réplication : aucune barre ×27 n'est dessinée dans ces vues.
  - Les **16 restantes** sont répliquées bâtiment par bâtiment → elles relèvent de la
    feuille de chaque sous-projet (composante Género, `ROADMAP_TAREAS`). ⚠ Elles ne
    coïncident encore qu'à moitié avec les 11 cartes Género existantes — à réconcilier.
- **Responsable = remplissage de la barre** (`PAG_RELLENO`), échelle à trois degrés
  dans la seule famille `CARD_TONOS.G` : ACEFE aplat `#674ea7`, UG aplat `#d9d2e9`
  **sans contour**, AT **fond blanc à contour `#674ea7`**. Pas de hachures : elles
  gardent leur sens actuel (excédent au-delà de la durée estimée, `CapaBarras`).
- **Cronograma** : `seccionesPag` (une section par cadena + les hitos) et
  `seccionPagGlobal` (une ligne par eje, dans « Proyecto global »).
  - Colonne de gauche = `code · titre`, tronqué, titre complet au survol (largeur
    `LABEL_W` normale). À droite de la barre, **seulement** la durée et la phase
    d'application — jamais de dates, pour rester aligné sur le reste du cronograma.
  - Vue globale : barres en **violet clair** `CARD_TONOS.G.head` avec le libellé
    écrit **DANS** la barre (`dentro`), repli sur `etiquetaCorta` si trop étroit.
  - **Hitos = une ligne chacun**, nom en clair dans la colonne et date à côté du
    repère (`filaHito`). Un rang de repères muets ne disait pas ce qu'ils étaient.
- **Hoja de ruta** : `components/hojas-de-ruta/pag-board.tsx` — format sur mesure
  (ni fases ni colonnes de composante), sept **rangées horizontales défilantes** de
  cartes. Une seule rangée par cadena, sans retour à la ligne : chaque flèche relie
  donc bien deux cartes voisines, et rappelle sous elle le **code de la carte
  précédente** pour que le lien reste explicite après défilement.
- **Édition** : uniquement depuis le mode Admin de la feuille. Le PAG n'est
  **pas branché dans la section `/admin`** (choix explicite).
- **Dates = proposition** : la colonne « Fecha en la que podría iniciarse » du fichier
  est vide sur 45 lignes sur 49. Les ancres viennent des semestres (colonne D), des
  durées (colonne L) et des enchaînements (M/N). Incohérences repérées et non tranchées :
  11.1.1 daté S1 2027 alors que 11.1.2 démarre en nov 2026 ; 9.2.1 renvoie à une 9.2.2
  inexistante ; 9.1.1 a deux libellés selon l'onglet ; 9.5.1 daté S2 2027 alors que les
  premières licitaciones tombent en févr 2027.

**Migrations** : dans `supabase/migrations/`, **dernière = 035**. Toute migration passe par MCP `execute_sql` (dev) ET un fichier `NNN_*.sql` versionné.
- 035 : sème le **planning** des 33 acciones du PAG (feuille `pag`, clés `pag-<code>`).
  Idempotente (`on conflict do nothing`) — ne réécrit aucune date saisie à la main.
- 032 : noms des 5 écoles préexistantes alignés sur le format officiel (`EPCD N°67 "…"`).
- 033 : phases des **9 sous-projets d'origine** relevées sur l'Excel « AT Etapa 1 —
  Cronograma » (Gantt en cellules colorées, 4 colonnes = 1 mois, origine août 2026,
  initiales de mois **françaises**). État antérieur dans `peebcoolsf_bak_fases_031`.
- 034 : les 18 écoles du périmètre décalées de +7 mois. **Non idempotente** — la rejouer
  ajouterait 7 mois de plus.

## Escuelas del alcance (migration 031)
- Les **18 écoles du périmètre** (17 sites — San Jorge en compte 2) sont en base, en
  plus des 5 écoles de Rosario / Santa Fe Capital → **23 écoles, 27 sous-projets**.
- Leurs hojas de ruta / cronogramas sont **copiés** d'une école typique :
  `SUB-E67` (avec cartes Patrimonio) ou `SUB-E574` (sans).
- ⚠ `SUBS_PATRIMONIO` (`lib/constants.ts`) doit rester **synchronisé** avec la colonne
  `plantilla` de la migration 031 : le code décide quelles cartes s'affichent, la
  migration a décidé lesquelles ont reçu un planning. Classement patrimonial
  **heuristique, à confirmer**.
- ⚠ Lecture **paginée obligatoire** (`fetchAllRows` dans `lib/snapshot.ts`) : le roadmap
  dépasse désormais 1 000 lignes (≈1 190 estado / 1 274 enlace) et PostgREST tronque
  **silencieusement** au-delà. Toute nouvelle lecture de ces tables doit paginer, avec
  un tri déterministe (clé primaire) sans quoi les pages se chevauchent.
