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
- Sous-projets : SUB-AIR, SUB-ASV, SUB-CENTENARIO, SUB-CULLEN, SUB-E67, SUB-E407, SUB-E574, SUB-E1109, SUB-E331
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
  (rôle : admin/gestion/consultor), `is_approved`, `created_at`, `requested_status`.
  `is_admin()`/`current_rol()` lisent `id`/`status`.
- Écriture d'événements (calendario) : RLS `eventos_admin` = **admin only** (la garde
  applicative laisse passer tout authentifié, mais la RLS reste le rempart).

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

**Migrations** : dans `supabase/migrations/`, **dernière = 030**. Toute migration passe par MCP `execute_sql` (dev) ET un fichier `NNN_*.sql` versionné.
