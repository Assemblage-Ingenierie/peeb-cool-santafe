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
  - Typologies (charte revue, août 2026) : A ámbar `#b45f10`, H burdeos `#8c3a52`,
    E sarcelle `#0b7d71`, texte blanc. Variante vibrante `TIPOLOGIA_COLOR_MAPA`
    réservée aux **marqueurs de carte**. Plus aucune typologie n'est rouge : le
    rouge appartient à la marque (`UI.accent`) et à l'AFD (`ROJO_AFD`).
  - `ROJO_AFD` / `GP_BARRA` / `HITO_COLOR` : source unique dans `constants.ts`.
    Le Gantt les importe — il les redéfinissait, d'où deux valeurs à maintenir.
  - ⚠ Les couleurs de **fase** du cronograma (dégradé de bleus, `FASE_COLOR`)
    restent en dur dans `cronograma-client.tsx` : toute nouvelle teinte doit
    éviter cette famille de bleus.
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
   - Depuis le modèle enveloppe (039), « Próximas tareas » n'annonce **plus les
     fases** : c'est le repère `Inicio de…` qui porte l'échéance. Les annoncer
     toutes deux faisait doublon (« Inicio del anteproyecto » puis
     « Anteproyecto », à un jour d'écart). Conséquence : ces lignes portent la
     composante **GP**, donc le filtre GP les masque — avant, les fases
     restaient visibles quel que soit le filtre.
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
- **Un impacto = un seul eje.** À cheval, on ne sait plus où chercher une acción.
  `5.1.1` (module de communication de la formation 4.1.4) relève de l'impacto 5 :
  il est dans l'eje `com`, pas dans `cap`. Le lien vers 4.1.4 est écrit sur la carte.
- **Liaisons : rien d'inféré.** `PAG_ENLACES` ne contient que les **13 paires
  réellement écrites** dans les colonnes M/N du fichier ; une flèche n'est
  dessinée que si elle y figure. Les « cadenas » d'une première version étaient
  inventées à 17 flèches sur 26 et en contredisaient trois — elles ont disparu au
  profit d'un regroupement par **eje** (le même partout : cronograma détaillé,
  vue globale, hoja de ruta). `accionesDeEje` ordonne par date en remontant chaque
  cible juste après sa source, pour que les vraies liaisons tombent en voisinage.
  Ce qui ne tombe pas en voisinage est écrit sur la carte (« Después de / Antes
  de »), et `PAG_RESTRICCIONES` porte ce qui ne peut pas être une flèche : ancres
  de phase, échéances vers la fase Obras, et l'alerte 9.2.2 (acción inexistante).
- **Cronograma** : `seccionesPag` (une section par eje, hitos intercalés) et
  `seccionPagGlobal` (une ligne par eje, dans « Proyecto global »).
  - Colonne de gauche = `code · titre`, tronqué, titre complet au survol (largeur
    `LABEL_W` normale). **Le titre est AUSSI écrit à côté de la barre**, suivi en
    gris de la durée et de la phase d'application : la colonne reste collée à
    gauche et tronquée quand on fait défiler l'axe, c'est à côté de la barre qu'on
    lit la ligne en entier. Jamais de dates à côté des barres (ni pour les
    acciones, ni pour les hitos) — elles se lisent à la position sur l'axe.
  - Vue globale : barres en **violet clair** `CARD_TONOS.G.head` avec le libellé
    écrit **DANS** la barre (`dentro`), repli sur `etiquetaCorta` si trop étroit.
  - **Hitos = une ligne chacun**, rangée sous la ligne dont le jalon est le
    livrable. Nom en clair des deux côtés — dans la colonne, précédé d'un petit
    triangle violet (`Fila.hito`), et à côté du repère. Jamais la date : elle se
    lit à la position sur l'axe.
- **Hoja de ruta** : `components/hojas-de-ruta/pag-board.tsx` — format sur mesure
  (ni fases ni colonnes de composante), une **rangée horizontale défilante par
  eje**. Les cartes ne passent jamais à la ligne : une flèche relie donc toujours
  deux cartes voisines, et rappelle sous elle le code de la précédente. Pas de
  liaison dans le fichier = pas de flèche, simple espace.
- **Édition** : uniquement depuis le mode Admin de la feuille. Le PAG n'est
  **pas branché dans la section `/admin`** (choix explicite).
- **Dates = proposition** : la colonne « Fecha en la que podría iniciarse » du fichier
  est vide sur 45 lignes sur 49. Les ancres viennent des semestres (colonne D), des
  durées (colonne L) et des enchaînements (M/N). Incohérences repérées et non tranchées :
  11.1.1 daté S1 2027 alors que 11.1.2 démarre en nov 2026 ; 9.2.1 renvoie à une 9.2.2
  inexistante ; 9.1.1 a deux libellés selon l'onglet ; 9.5.1 daté S2 2027 alors que les
  premières licitaciones tombent en févr 2027.

## Cronograma de subproyecto — la fase est l'ENVELOPPE de ses tâches (migration 036)
- **Principe** : la barre d'une phase n'est plus saisie. Elle commence avec sa
  première ligne et finit avec la dernière (`fasesEnvolventes` dans
  `computeSchedule`). Une phase sans aucune ligne datée n'a **pas de barre**
  (`sinAncla`) et sa section disparaît du cronograma.
- **Repères** : pour que les tâches aient une accroche qui ne soit pas leur
  propre phase (ce serait circulaire), chaque phase reçoit deux lignes d'un jour,
  rendues en **losange** (une barre d'un jour ferait 2 px) :
  - `__ini__<fase>` — début de phase. Les tâches qui « démarrent avec la phase »
    s'y accrochent ; **déplacer ce seul repère décale toute la suite**.
  - `__ent__<fase>` — remise du livrable. Les tâches qui « finissent avec la
    phase » y accrochent leur **fin**. Distinct de la fin de phase : la
    validation (`Validación de anteproyecto`) et la no objeción AFD viennent après.
- **`__cno__<code>`** : les « No objeción AFD » cessent d'être des phases vides.
  Ce sont des jalons **hors phase** (`fase: ""`) → ils n'allongent aucune
  enveloppe. Affichés sous la phase dont ils dépendent (colonne `fila`).
- ⚠ **Toute vue qui lit `sched.get(faseNodeKey(code))` doit gérer `sinAncla`** :
  le nœud d'une fase sans ligne datée (les trois CNO) renvoie le repli du
  moteur, le 1ᵉʳ janvier 2026, qui s'afficherait comme une vraie date. Les
  frises de la vue globale du cronograma (`barrasFases`) et les lignes de fase
  des Hojas de ruta basculent dans ce cas sur `HITO_CNO_PREFIX + code`.
- Le rôle se lit dans **le préfixe de la clé** — aucune colonne de plus en base.
  `rolDeHito()` / `esHitoKey()` / `lineasHito()`. Ces lignes sont `creada=true`
  mais **exclues des cartes** de hoja de ruta (`construirCartasPorFila`) : elles
  ne portent que du planning.
- **Nouveau champ de liaison `extremo`** (`inicio` par défaut = comportement
  historique, `fin` = la cible TERMINE à la date visée, son début recule de sa
  durée). Colonne ajoutée pour toutes les feuilles, sans effet sur les autres.
- **Périmètre** : `esModeloEnvolvente()` (`lib/constants.ts`) = **tous les
  `SUB-*`** depuis la migration 039 (le déploiement a commencé par SUB-AIR,
  036-038). `global` et `pag` gardent leur logique propre. Le drapeau doit être
  passé aux **trois** points d'assemblage, sinon les vues divergent :
  `cronograma-client.tsx` (`armar`), `hojas-de-ruta-client.tsx` (useMemo
  `schedule`) et `lib/agenda.ts`.
- **Ordre des lignes = CHRONOLOGIQUE**, toutes composantes confondues. Grouper
  d'abord par composante (comportement d'origine) cassait la lecture de la
  chaîne : « Negociación y firma del contrato » (GP) s'affichait avant les
  jalons AFD dont elle découle. À date égale, `ORDEN_ROL` fait entrer par le
  repère `Inicio` et sortir par la remise puis les CNO.
- ⚠ **`peebcoolsf_gestion_lineas` ne pilote plus AUCUNE date du planning.** Les
  quatre points de calcul (`cronograma-client`, `hojas-de-ruta-client`,
  `agenda`, `fases-actuales`) construisent leurs nœuds `__fase__` depuis
  **`GESTION_FASES`** (le référentiel du code). La table a servi une seule fois,
  à la migration 039, pour fabriquer les repères ; ensuite les repères ont pris
  le relais. Avant 036 ses dates écrasaient les liaisons entre phases : celles-ci
  existaient mais **ne servaient à rien** (la date manuelle gagne, priorité 1).
  - Objectif : **tout se pilote depuis le cronograma**, et la section
    « Gestión de subproyectos » de l'Admin sera supprimée. Les 3 lecteurs
    « métier » de la progresión (`bottom-band` bloc Progreso, `GlobalTable`,
    `export-resumen`) ne lisent **plus l'`estado` stocké** : ils dérivent l'état
    de chaque phase du modèle enveloppe via `estadoFasesDe` (`lib/fases-actuales`,
    source unique partagée avec le tracker de l'Inicio). Quatre états —
    `entregada` (case de remise cochée) / `en_curso` (hoy dans l'enveloppe) /
    `atrasada` (remise échue non cochée, **rouge clair `ROJO_ATRASADA`**) /
    `por_venir` — définis dans `constants.ts` (`EstadoFaseVista`,
    `colorEstadoFaseVista`, `FASES_PROGRESO`). Ces vues n'affichent plus que les
    **6 phases à remise** : « No objeción AFD » (jalon `__cno__` sans remise) en
    est retirée, comme dans le cronograma. **Étapes restantes** : passer la
    section Admin en lecture seule, puis la retirer.
    - Le **toggle de scénario** Factibilidad/Proyecto (`bottom-band`, `mapa-client`)
      ne lit **plus l'`estado`** non plus : « Proyecto ejecutivo démarré » se
      dérive du repère `__ini__PE` dépassé (`faseIniciada(estadoFasesDe(...))`).
      Sémantique = **prévision du planning** (le toggle s'active à la date prévue),
      plus « un admin l'a coché ». `use-escenario` inchangé (reçoit `canToggle`).
      Plus aucun lecteur d'`estado` hors la section Admin elle-même.
  - **L'avancement se saisit dans le cronograma** : une case sur la ligne
    `__ent__<fase>` (le repère de remise), réservée aux admins, qui écrit
    `realizada` via `roadmapSetRealizada`. C'est la SEULE saisie d'avancement du
    modèle — le reste se déduit. Une remise **échue et non cochée** affiche
    « atrasada » en rouge de marque : le planning ne colle plus au réel et il
    faut le remettre à jour. Quatre états lisibles sans rien saisir de plus :
    livrée / en cours / en retard / à venir.
  - ⚠ **Ne jamais supprimer la table** : elle porte aussi les **documents** des
    sous-projets (`tipo_linea <> 'etapa'`). Et même les lignes `etapa` doivent
    rester : la migration 039 les relit pour fabriquer les repères, et elles
    sont la seule trace de l'échelonnement d'origine.
- **Conversion des liaisons** (SUB-AIR, 30 liaisons « tarea → sa propre fase »
  reconverties sans arbitrage manuel) : famille A (`punto: inicio`) → `__ini__` ;
  famille B (`punto: fin`) → `__ent__` avec `extremo: "fin"` et l'écart
  `-desfase - durée` (0 dans 12 cas sur 14) ; `validacion_anteproyecto` → après
  la fin de `__ent__`.
- **Noms de livrables validés avec le client** (août 2026), les six :
  `Entrega de los estudios preliminares`, `Entrega del anteproyecto`,
  `Entrega del proyecto ejecutivo`, `Entrega del pliego`,
  `Entrega del informe de evaluación`, `Recepción de obra`.
- **Une seule date absolue par sous-projet** (migration 037) : le démarrage de la
  chaîne, `__ini__estudios_preliminares`. Tout le reste se déduit — déplacer ce
  seul repère décale le sous-projet entier. Une date saisie au milieu de la
  chaîne fige son maillon et bloque la propagation : c'est le défaut à traquer.
- **Chaîne d'avancement** (SUB-AIR, migration 037) : Entrega EP → Inicio AP →
  Entrega AP → Validación AP → Inicio PE → Entrega PE → **Validación PE** →
  Inicio pliegos → Entrega pliego → No objeción AFD → Inicio licitación →
  Análisis → Entrega informe → CNO Atribución → Negociación → CNO Contrato →
  Inicio obra → Recepción.
- **Détecteur de câblage douteux** : une phase dont l'enveloppe démarre AVANT
  son propre repère `Inicio` signale toujours qu'une de ses tâches pend de
  quelque chose d'antérieur. C'est arrivé avec `Pre-categorización provincial
  digital`, accrochée un temps au début de l'anteproyecto alors qu'elle
  appartient au proyecto ejecutivo (corrigé en 038). Sur SUB-AIR, chaque
  enveloppe va désormais exactement de son `Inicio` à son terme.
- **Pas encore fait** : le mode édition interactif du cronograma (bouton
  « Editar », fiche durée/ancrage au clic sur une barre, insertion et
  suppression de ligne au survol, réordonnancement au glisser, mode « Ver
  dependencias », annulation). Maquette de référence validée, à porter.

**Migrations** : dans `supabase/migrations/`, **dernière = 039**. Toute migration passe par MCP `execute_sql` (dev) ET un fichier `NNN_*.sql` versionné.
- 039 : modèle enveloppe étendu aux **26 sous-projets restants**. Conversion
  mécanique (ils n'ont que deux formes : 48 liaisons avec Patrimonio, 46 sans).
  ⚠ L'**échelonnement du programme** (attente entre fin des EP et début de
  l'anteproyecto : Cullen 417 j, Centenario 318 j, ASV 75 j, les 23 autres ≈ 0)
  était porté par les dates de fase ; il est reporté sur le **décalage de la
  liaison** pour que la conversion reste neutre sans réintroduire de date
  absolue. Sauvegardes `peebcoolsf_bak_enlace_039` / `_bak_fechas_039`.
- 038 : `Pre-categorización provincial digital` (SUB-AIR) démarre avec le
  proyecto ejecutivo, sa propre fase — corrige la liaison de 037.
- 037 : recâblage de la chaîne d'avancement de **SUB-AIR** (une seule date
  absolue, cf. ci-dessus) et création de `validacion_proyecto_ejecutivo` dans
  `ROADMAP_TAREAS` → semée avec sa durée (2 semaines) pour **les 27
  sous-projets**. Chez les 26 restés au modèle historique elle se pose au début
  de sa fase (aucune liaison) et ne déplace rien. État antérieur des liaisons
  SUB-AIR dans `peebcoolsf_bak_enlace_037`.
- 036 : modèle enveloppe sur **SUB-AIR** (voir section ci-dessus). Colonne
  `extremo`, 15 lignes-repère, réécriture des 46 liaisons en 53. État antérieur
  dans `peebcoolsf_bak_enlace_036`. Inserts idempotents, mais le `delete` des
  liaisons SUB-AIR se rejoue sans risque (elles sont toutes réinsérées).
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
