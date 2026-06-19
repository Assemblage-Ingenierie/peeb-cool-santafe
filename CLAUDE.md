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
- Données manquantes = NULL → afficher « — », jamais 0
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
- Lecture en dev : via endpoint serveur `/api/snapshot` en `service_role` (jamais exposée au client) — à implémenter Étape 4.

## Conventions UID
- Sous-projets : SUB-AIR, SUB-ASV, SUB-CENTENARIO, SUB-CULLEN, SUB-E67, SUB-E407, SUB-E574, SUB-E1109, SUB-E331
- Équipe : EQ-001, EQ-002, …
- Entités : ENT-001, …
- Événements : EVT-0001, …
- Documentation GP : GP-DOC-MANUAL, GP-DOC-PAC, GP-DOC-MV, GP-DOC-PRESUP, GP-DOC-INI, GP-DOC-PER1, …
- Capacitaciones : CAP-EE-01, CAP-AYS-01, CAP-G-01, … (documents) | CAPEVT-… (événements)
- Gestion sous-projet : GEST-<SUB_CODE>-<n>, ex. GEST-AIR-0001

## Étapes de développement
1. ✅ Schéma DB + RLS + seed
2. Charte + layout (sidebar, header, constantes couleur)
3. Admin (CRUD + UID visibles)
4. Inicio (Dashboard) + Mapa
5. PWA offline (lecture)
6. Auth Supabase + RLS productif + gestion des rôles
