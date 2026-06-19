# Prompt pour Claude Code — Initialisation du projet « PEEB Cool Santa Fe »

> Colle ce prompt dans une nouvelle session de Claude Code, **dans un dossier vide**. Place dans ce même dossier le fichier `CAHIER_DES_CHARGES_FR.md` et le Excel `PEEB_Santa_Fe__Tabla_general.xlsx`. Claude Code se charge de tout le reste : scaffolding, repo GitHub, commits.
>
> **Prérequis déjà en place de ton côté :** Node.js 18+, Git, GitHub CLI (`gh`) authentifié, et Claude Code connecté.
>
> **Important :** l'interface du site est **entièrement en espagnol (Argentine)**. En revanche, mes instructions et le cahier des charges sont en français. Tous les libellés, textes affichés, noms de pages et valeurs de données restent en espagnol ; seul le code/les commentaires/échanges avec moi sont en français.

---

Tu vas construire une application web de suivi de projet appelée **PEEB Cool — Santa Fe**. Lis d'abord intégralement le fichier `CAHIER_DES_CHARGES_FR.md` situé à la racine : c'est la spécification de référence. **Toute l'interface est en espagnol (Argentine).**

## Mise en place initiale (à faire en premier, avant l'Étape 1)
Je veux que tu gères toute la mise en place toi-même :
1. **Échafaude le projet Next.js** (App Router, TypeScript, Tailwind) dans le dossier courant.
2. **Initialise Git** (`git init`) et crée un `.gitignore` adapté à Node/Next/Supabase. Vérifie impérativement que `.env*` (notamment `.env.local`) y figure : aucune clé secrète ne doit jamais être commitée.
3. **Crée un repo GitHub privé** nommé `peeb-cool-santafe` avec le GitHub CLI (`gh repo create peeb-cool-santafe --private --source=. --remote=origin`). Si `gh` n'est pas authentifié, dis-le-moi et arrête-toi.
4. **Crée un fichier `.env.local.example`** (sans secrets) listant les variables attendues (URL/clé Supabase, `NEXT_PUBLIC_DEV_AUTH_BYPASS`, etc.), et un `README.md` expliquant comment cloner, installer, configurer l'environnement et lancer le projet.
5. Fais un **commit initial** (« chore: scaffolding initial ») et pousse-le sur `main`.

Après chaque étape validée par moi, fais un **commit dédié** avec un message clair (ex. « feat(db): schéma + seed Étape 1 ») et pousse-le. Ne pousse jamais de secret.

> Note : tu n'as pas besoin de Supabase/Vercel en ligne pour l'Étape 1 (les migrations peuvent tourner en local). On branchera Supabase puis Vercel plus tard, et tu me guideras le moment venu.

## Stack obligatoire
- **Next.js** (App Router, TypeScript) + **Tailwind CSS**.
- **Supabase** (Postgres + RLS + Auth) comme backend.
- Déploiement prévu sur **Vercel**. Les deux en free-tier : optimise l'egress (voir §6 du CDC).
- **PWA** avec offline en **lecture** (cache du shell + dernier snapshot). Écriture en ligne uniquement.

## Règles de travail
1. **N'ajoute aucune fonctionnalité absente du CDC.** Si tu penses qu'il manque quelque chose, demande-moi avant de l'implémenter.
2. Travaille **bottom-up** en suivant le plan de la §7. **Arrête-toi à la fin de chaque étape** et montre-moi ce que tu as fait avant de continuer.
3. Centralise les couleurs, les libellés de composantes/typologies et les règles de contraste dans `lib/constants.ts` (valeurs exactes en §2.3 et §2.4 du CDC).
4. Chaque ligne visible par l'utilisateur doit avoir un **UID lisible et stable** (convention en §3.1), en plus de l'UUID technique. Les UID doivent être visibles et copiables sur la page Admin.
5. **Ne stocke pas les calculs dérivés** (économie kWh, %, kWh/m²) : ils sont calculés à l'affichage. Les données manquantes sont **NULL → affichées « — »**, jamais 0.
6. Active le **RLS dès le départ** sur toutes les tables. En développement, utilise un **bypass d'auth** avec un utilisateur mock admin contrôlé par une variable d'environnement (`NEXT_PUBLIC_DEV_AUTH_BYPASS`). L'auth réelle Supabase est branchée à la dernière étape.
7. Documents volumineux = **liens externes** (champ URL). N'utilise pas Supabase Storage pour les PDF.

## Étape 1 — la seule à exécuter maintenant

Fais **uniquement l'Étape 1**, puis arrête-toi pour que je révise :

### 1a. Schéma de base de données
- Crée les migrations SQL pour toutes les tables de la §3 du CDC (`subproyectos`, `metricas`, `equipo`, `entidades`, `eventos`, `documentacion_gp`, `gestion_financiera`, `capacitaciones` (documents et événements), `gestion_lineas`, `perfiles`, et les tables/énumérations de référence).
- Définis clairement la colonne `uid` (clé métier, unique) et l'`id` UUID technique.
- Dans `metricas`, utilise la colonne `escenario` ∈ {`faisabilidad`, `proyecto`}. Tous les champs numériques **nullables**. Les bénéficiaires ne s'appliquent qu'au scénario `faisabilidad`.
- Écris les **politiques RLS** : lecture pour les authentifiés, écriture pour le rôle `admin` uniquement.

### 1b. Seed
- Charge les sous-projets, métriques et bénéficiaires de la **§5 du CDC** (extraits de la feuille `Resumen` du Excel). Respecte les NULL (données manquantes).
- Sème les énumérations (componentes, tipologias, fases, estados, tipo_linea).
- Sème les lignes par défaut : Documentation GP (Manual Operativo, Plan de adquisiciones, Plan de M&V, Presupuesto, Informe de inicio, Informe periódico 1) ; Capacitaciones (Formación 1/2/3 par sous-section) ; Gestion de sous-projet (Auditoria, Planos pdf, Proyecto ejecutivo, Pliego par sous-projet).
- **Coordonnées géographiques :**
  - **Écoles** : utilise les coordonnées fournies au §5 du CDC (tableau « Coordonnées géographiques des écoles »). Celle de l'école 407 est approximative (déduite de l'adresse).
  - **Aéroports et hôpitaux** : récupère sur le web (cherche toi-même) les coordonnées des **aéroports** (Internacional de Rosario / Islas Malvinas, et Sauce Viejo) et des **hôpitaux** (del Centenario de Rosario, J. M. Cullen de Santa Fe).

### 1c. Vérification
- Génère un script ou une requête qui liste tous les sous-projets avec leurs métriques et UID, pour que je valide que le seed correspond au tableau de la §5.
- Documente dans le README : variables d'environnement nécessaires, comment lancer les migrations et le seed, et le dossier `public/logos/` avec les **4 placeholders** attendus (`assemblage.svg`, `assemblage-a.svg`, `afd.svg`, `santafe.svg`) et où les déposer.

Quand tu as terminé l'Étape 1, montre-moi le schéma, le résultat du seed et attends mon feu vert avant de passer à l'Étape 2 (charte + layout).

Avant de commencer, si quelque chose dans le CDC te paraît ambigu, pose tes questions maintenant.
