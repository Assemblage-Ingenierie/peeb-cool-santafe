# Prompt de lancement — session suivante (PEEB Cool Santa Fe)

> À coller dans une nouvelle session de Claude Code, **dans le dossier du repo** `C:\Users\maelb\github\PEEB Santa Fe`. La mémoire projet et `CLAUDE.md`/`AGENTS.md` se chargent automatiquement.

---

Tu reprends le développement de **PEEB Cool — Santa Fe** (app web PWA de suivi de réhabilitation énergétique de bâtiments publics — Assemblage ingénierie / AFD / Province de Santa Fe). Branche `main`.

**Avant de coder, lis :**
- `CAHIER_DES_CHARGES_FR.md` (le .md fait foi ; le PDF est gitignoré) — la section pertinente à la tâche.
- La **mémoire projet** (auto-chargée : `project_peeb_santa_fe.md` + `MEMORY.md` + feedbacks).
- Les **derniers récaps** dans `docs/rapports/` (notamment `RAPPORT_calendario-*`, `RAPPORT_ays-*`, `RAPPORT_format_*`, `RAPPORT_agenda_bandeau_*`).
- **Next.js 16** (ruptures d'API vs tes connaissances) : `AGENTS.md` + les guides dans `node_modules/next/dist/docs/` **avant** d'écrire du code.

**Règles impératives (ne pas dévier) :**
- **Supabase via le connecteur MCP uniquement**, jamais la CLI. **`execute_sql` en dev, JAMAIS `apply_migration`** ; `execute_sql` non-atomique → lots **idempotents**. Projet **EXTERNAL** id `grnkbnldfzdzrgleorra`. Toutes les tables préfixées **`peebcoolsf_`**. **Ne jamais toucher aux données réelles** (base remplie : équipe 20, événements, 8 medidas × 9 sous-projets, docs GP 31, **requisitos AyS 153**, entidades 7…). Toute migration SQL → aussi un fichier `supabase/migrations/NNN_*.sql` (trace ; dernière = 013).
- Couleurs/libellés **uniquement** dans `lib/constants.ts` (COMPONENTES/getComponente — GP #30323e, EE #fff2cc, AyS #d9ead3, G #d9d2e9 ; accent rouge Assemblage #E30513). Calculs dérivés dans `lib/calc.ts` ; formatage dans `lib/format.ts` (NULL = « — », jamais 0 ; **milliers séparés par une espace insécable**, décimales en virgule).
- Lecture dashboard/pages publiques = **`/api/snapshot`** (`lib/snapshot.ts` `getSnapshot()`, service_role serveur, cache SWR ~60 s). Hook client `components/dashboard/use-snapshot.ts` (param `refreshKey` → recharge cache-busté après écriture). **Le snapshot filtre `publicar=true` à la source pour les documents** (pas de fuite des non-publiés).
- UI en **espagnol (Argentine)** ; code/commentaires/échanges en **français**. **Communication SANS jargon** : trancher soi-même les détails techniques, ne demander que les vrais choix métier/UX.
- **Méthode** : découper en **sous-lots** ; **commit dédié** + court récap `.md` dans `docs/rapports/` ; **PAUSE entre sous-lots** pour validation. Vérifier l'état contre la base via MCP.

**Gotchas (appris en session) :**
- **React Compiler activé** : éviter les `useMemo`/`useCallback` manuels qui déclenchent `react-hooks/preserve-manual-memoization` ; préférer un helper pur **au niveau module** (cf. `scrollToTarget` dans `components/dashboard/agenda.tsx`) ou le pattern « ajuster l'état pendant le rendu » (cf. `components/dashboard/use-escenario.ts`). `npm run lint` doit rester **au vert**.
- **Dev/aperçu** : `npm run dev` (port 3000). ⚠️ Si un `next dev` tourne déjà sur 3000, l'aperçu géré (`preview_start`) **ne peut pas** lancer un 2ᵉ serveur → demander à l'utilisateur de libérer le port (Ctrl+C dans son terminal) avant de tester au navigateur, sinon vérifier via DOM/HTTP. Le snapshot étant caché ~60 s, vérifier une écriture avec un fetch **cache-busté** (`/api/snapshot?bust=...` + `cache:no-store`).
- **Commits multilignes** : passer par un fichier (`git commit -F .git/COMMIT_TMP.txt` puis supprimer) — les here-strings PowerShell cassent sur les guillemets. Fin de message de commit : `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Auth en dev = bypass (`NEXT_PUBLIC_DEV_AUTH_BYPASS=true`) → tout le monde est « admin (dev) ». La vraie séparation des rôles = Étape 6.

**État (terminé, branche main) :**
- ✅ Étapes 1–4 + tous les ajustes.
- ✅ **Calendario (CDC §4.3)** : grille mensuelle (lundi→dimanche) + **fuseau Argentine⇄France**, détail au clic, **création/édition/suppression d'événements pour tous** (`app/calendario/actions.ts`, table journal `peebcoolsf_eventos_actividad`), **alerte « +N »** sur Inicio (réunions ajoutées/supprimées).
- ✅ **Requisitos AyS** : AyS n'est plus une *medida* → section dédiée (table `peebcoolsf_ays_requisitos` 17 plans MGAS, `subproyectos.ays_texto`, `REQUISITOS_AYS` dans constants). Admin = `components/admin/ays-requisitos-editor.tsx` (groupes repliables + texte libre) ; dashboard = `components/dashboard/ays-block.tsx`. Colonne AyS retirée du Resumen + export. Migrations 012/013.
- ✅ Correctifs : filtre `publicar` (snapshot), tech debt ESLint (lint vert). Resumen = barre de progression continue. Chiffres = espace milliers. Bandeau Agenda = fond #434343 pleine largeur.

**À faire — dis-moi lequel (sinon je propose) :**
- ⏳ **Étape 5 — PWA offline** (lecture hors-ligne : manifest, service worker, cache du snapshot).
- ⏳ **Étape 6 — Auth Supabase + RLS productif + rôles** (admin/gestion/consultor ; activer la séparation admin/non-admin déjà préparée : alerte +N visible admin seul, écriture événements pour authentifiés ; leaked password protection).
- Reporté (sur décision) : **câblage des 4 filtres GP/EE/AyS/G** du header (encore inertes — filtreraient par composante) ; **vues semaine/jour** du Calendario ; **3ᵉ bloc** « Por definir » du mode Proyecto global ; structure **Gestión financiera** (CDC §3.3).

**Démarrage :** confirme le périmètre du 1ᵉʳ sous-lot de la tâche choisie, puis **PAUSE** pour validation avant de coder.
