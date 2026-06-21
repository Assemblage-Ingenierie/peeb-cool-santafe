# Cahier des charges — Application de suivi « PEEB Cool — Santa Fe »

**Version :** 1.0
**Langue de l'interface :** Espagnol (Argentine)
**Langue des documents de travail (CDC, prompts) :** Français
**Client / contexte :** Assistance technique Assemblage Ingénierie — Financement AFD — Province de Santa Fe
**Objet :** Suivi d'un projet de réhabilitation énergétique de bâtiments publics.

---

## 1. Objectif et périmètre

Application web (PWA) de suivi de projet qui permet de :
- Administrer la base de données vivante du projet (page **Admin**, admins uniquement).
- Visualiser l'avancement global et par sous-projet, filtrable par composante (**Inicio / Dashboard**).
- Localiser les sous-projets sur une carte avec les données énergétiques clés (**Mapa**).
- Gérer l'équipe, le calendrier, les formations et la documentation.

**Utilisateurs :** ~40 personnes. **Trois rôles** : **Admin** (accès total + page Admin + gestion des rôles), **Gestión** (lecture complète, y compris les éléments confidentiels ; périmètre d'édition à préciser) et **Consultor** (lecture, **sans accès aux éléments marqués confidentiels**). Voir §3.4 (sécurité) et §4.4 (confidentialité par ligne).

**Contraintes techniques :**
- Déploiement **Vercel** + base de données **Supabase** (les deux en free-tier → optimiser l'egress).
- Application **légère** (mauvaises connexions). **Offline en lecture** (PWA, dernier snapshot en cache) ; écriture en ligne uniquement.
- Documents volumineux (audits PDF 4–7 Mo, plans) → **liens externes** (champ URL), jamais servis par l'application.

---

## 2. Identité visuelle (charte graphique)

### 2.1 Layout général (voir capture de référence)
- **Barre latérale** gris foncé (`#30323e`) à gauche :
  - En haut : logo **Assemblage Ingénierie** (placeholder).
  - Navigation entre les pages.
  - Sert également à la gestion de projet.
  - En bas à droite : logo **« A »** en transparence (filigrane).
  - Pied : nom de l'utilisateur + rôle + bouton de déconnexion.
- **Fond** de l'application : gris clair.
- **Header** supérieur : ligne avec les logos **AFD** et **Province de Santa Fe** (placeholders), et à droite les **4 boutons de filtre par composante (GP, EE, AyS, G)**. Ces boutons sont **fixes et persistants** (présents en permanence dans le header, quelle que soit la page) et permettent de **filtrer la vue par composante à tout moment**. Les modalités précises de filtrage (effet sur chaque page, combinaison de filtres, état actif) seront définies ultérieurement.

### 2.2 Dossier des logos (placeholders)
Créer dans le repo : `public/logos/` avec les fichiers attendus :
- `public/logos/assemblage.svg` (ou .png) — logo barre latérale
- `public/logos/assemblage-a.svg` — filigrane « A »
- `public/logos/afd.svg` — header
- `public/logos/santafe.svg` — header

Tant que les fichiers n'existent pas, afficher des **placeholders** avec le nom du fichier attendu et une bordure pointillée. Documenter dans le README où les déposer.

### 2.3 Code couleur — Composantes
| Code | Composante | Couleur | Texte sur fond |
|---|---|---|---|
| GP | Gestion de proyecto | `#30323e` | **clair sur fond foncé** |
| EE | Eficiencia energética | `#fff2cc` | foncé sur clair |
| AyS | Ambiental y social | `#d9ead3` | foncé sur clair |
| G | Género | `#d9d2e9` | foncé sur clair |

### 2.4 Code couleur — Typologies de bâtiment
*(à utiliser uniquement lorsque c'est demandé explicitement)*
| Code | Typologie | Couleur | Texte |
|---|---|---|---|
| A | Aeropuertos | `#990000` | clair sur foncé |
| H | Hospitales | `#cc0000` | clair sur foncé |
| E | Escuelas | `#3c78d8` | clair sur foncé |

> Centraliser toutes ces valeurs (couleurs, libellés, règles de contraste) dans un unique fichier `lib/constants.ts`.

---

## 3. Modèle de données

> **Convention de nommage des tables (protocole entreprise) :** toutes les tables sont créées dans le projet Supabase **External** (apps clients/partenaires) et **préfixées** du nom de l'app : **`peebcoolsf_`** (ex. `peebcoolsf_subproyectos`). Les noms de tables ci-dessous sont donnés sans préfixe pour la lisibilité ; le préfixe `peebcoolsf_` est ajouté à la création. Voir §9 pour le protocole de déploiement Supabase.

> Principe : schéma **relationnel typé** pour tout ce qui est consulté/filtré (sous-projets, métriques, événements, équipe), et tables **« ligne flexible » type Airtable** uniquement là où c'est nécessaire (gestion de sous-projet, formations, documentation GP). Chaque ligne visible par l'utilisateur possède un **UID lisible et stable** (clé métier) en plus de l'UUID technique, afin de pouvoir le référencer dans les prompts ultérieurs.

### 3.1 Convention d'UID lisibles
- Sous-projets : `SUB-AIR`, `SUB-ASV`, `SUB-CENTENARIO`, `SUB-CULLEN`, `SUB-E67`, `SUB-E407`, `SUB-E574`, `SUB-E1109`, `SUB-E331`, …
- Équipe : `EQ-001`, `EQ-002`, …
- Entités : `ENT-001`, …
- Événements calendrier : `EVT-0001`, …
- Documentation GP : `GP-DOC-MANUAL`, `GP-DOC-PAC`, `GP-DOC-MV`, `GP-DOC-PRESUP`, `GP-DOC-INI`, `GP-DOC-PER1`, …
- Formations : `CAP-EE-01`, `CAP-AYS-01`, `CAP-G-01`, … (documents) et `CAPEVT-…` (événements)
- Gestion de sous-projet : documents `GEST-<SUB>-NNNN` (ex. `GEST-AIR-0001`) ; fases `GEST-<SUB>-<code_fase>` (ex. `GEST-AIR-no_objecion_afd`).
- Nouveaux sous-projets (écoles ajoutées) : `SUB-ESC-NNN`.

### 3.2 Tables de référence (énumérations)
- `componentes` (GP, EE, AyS, G) — libellé + couleur (ou constante en code).
- `tipologias` (A, H, E) — libellé + couleur.
- `fases` (chronologiques, **8**) : `Estudios preliminares`, `Anteproyecto`, `Proyecto ejecutivo`, `Redacción de pliegos`, `No objeción AFD`, `Licitación`, `Obra`, `General`.
- `estados` : `En proceso` (jaune `#ffd966`), `Terminado` (vert clair `#b6d7a8`), + valeur vide autorisée.
- `tipo_linea` : `Documento`, `Etapa` — distingue les deux sous-sections de la gestion de sous-projet (non exposé en dropdown dans l'UI).

### 3.3 Tables principales

**`subproyectos`**
- `uid` (PK métier), `nombre`, `tipologia` (A/H/E), `seccion` (regroupement : Aeropuertos / Hospitales / Escuelas), `orden`.
- **Datos del edificio :** `direccion`, `lat`, `lng`, `superficie_m2`, `notas` (texte libre formaté — **gras** + couleur **rouge Assemblage** ; stocké en HTML restreint assaini), (+ champs extensibles plus tard).

**`metricas`** (1 ligne par sous-projet et par **scénario**)
- `subproyecto_uid` (FK), `escenario` ∈ {`faisabilidad`, `proyecto`} *(valeur technique conservée ; libellé affiché « **factibilidad** » dans l'UI)*.
- Champs (tous nullables → « donnée manquante » = NULL, jamais 0) :
  - `demanda_kwh` (Consumos de energía final totales — Demanda teórica, kWh)
  - `demanda_despues_kwh`
  - `gei_antes_tco2`, `gei_despues_tco2`
  - `costo_ee_eur`, `costo_otras_eur`
  - **Scénario `faisabilidad` uniquement** (bénéficiaires) : `benef_personal`, `benef_personal_pct_muj`, `benef_usuarios`, `benef_usuarios_pct_muj`, `benef_indirectos`, `benef_indirectos_pct_muj`.
- **Ne pas stocker** les calculs dérivés (économie kWh, %, kWh/m²) : ils sont calculés à l'affichage à partir de `demanda_kwh`, `demanda_despues_kwh` et `superficie_m2`.

**`equipo`**
- `uid`, `apellido`, `nombre`, `entidad_uid` (FK), `rol`, `componente` (dropdown), `telefono`, `mail`, `sexo` (optionnel).

**`entidades`**
- `uid`, `nombre`. (Liste gérable depuis la page Equipo : ajouter/supprimer.)

**`eventos`** (Calendrier)
- `uid`, `nombre`, `fecha`, `hora_inicio`, `hora_fin`, `participantes` (multi, réfs vers `equipo` **ou** `entidades` — dropdown avec recherche), `componente` (dropdown), `modalidad` ∈ {`Presencial`, `Virtual`}, `lugar`, `url_conexion` (si virtuel). Apparaissent dans le dashboard (Agenda).

**`documentacion_gp`** (Gestion de proyecto → Documentation)
- `uid`, `nombre_documento` (éditable), `url`. Lignes initiales : Manual Operativo, Plan de adquisiciones, Plan de M&V, Presupuesto, Informe de inicio, Informe periódico 1.

**`gestion_financiera`** (Gestion de proyecto → structure minimale ; contenu à définir)
- Réserver une table/section ; champs à préciser ultérieurement.

**`capacitaciones`** (3 sous-sections **confirmées** : `Eficiencia energética` (EE), `Ambiental y social` (AyS), `Género` (G))
- Type `documento` : `uid`, `subseccion`, `componente` (dropdown avec pastille de couleur), `url`.
- Type `evento` : `uid`, `subseccion`, `componente`, `entidades` (multi, réfs vers `entidades`), `participantes` (multi, réfs vers `equipo`), `fecha_hora`, `documento_uid` (dropdown, relie à un document de la même section).
- Seed : pour chaque sous-section, lignes `Formation 1`, `Formation 2`, `Formation 3` (titre éditable).

**`gestion_lineas`** (Gestion de sous-projet) — colonnes : `uid`, `subproyecto_uid` (FK), `titulo`, `orden`, `tipo_linea`, `componente`, `url`, `estado`, `fecha`, `fecha_inicio`, `fecha_fin`, `fase`, `confidencial`, `publicar`. **Deux usages via `tipo_linea`**, présentés en deux sous-sections (voir §4.5) :
- **Documentos** (`tipo_linea='documento'` ou vide) — style Airtable : `titulo`, `orden` (drag & drop), `componente` (pastille), `url`, `estado`, `fecha`, + `confidencial`/`publicar`. UID `GEST-<code_sub>-NNNN`. Bouton **+** pour ajouter. Seed par sous-projet : `Auditoria`, `Planos pdf`, `Proyecto ejecutivo`, `Pliego`.
- **Fases** (`tipo_linea='etapa'`) — **liste fixe, 1 ligne par fase**, pré-remplie à la création du sous-projet (le nom de la fase devient `titulo`, en lecture seule). Champs éditables : `estado`, `fecha_inicio`, `fecha_fin`. UID stable `GEST-<code_sub>-<code_fase>`. Pas d'ajout/suppression/drag, non confidentiable.

### 3.4 Sécurité (RLS dès le départ)
- Activer le **Row Level Security** sur toutes les tables (préfixées `peebcoolsf_`) dès le jour 1.
- **Trois rôles** dans `perfiles` (`user_id`, `rol` ∈ {`admin`, `gestion`, `consultor`}) :
  - **Admin** : lecture + écriture sur tout ; accès page Admin et gestion des rôles.
  - **Gestión** : lecture de tout (y compris confidentiel) ; écriture selon périmètre à préciser (par défaut, pas d'écriture tant que non défini).
  - **Consultor** : lecture seule, **excluant les lignes marquées confidentielles**.
- **Confidentialité par ligne :** les tables documentaires (voir liste §4.4) portent un champ `confidencial` (booléen, défaut `false`). Une ligne `confidencial = true` n'est **pas lisible par un Consultor** (filtrée par RLS). Admin et Gestión voient tout.
- **Écriture** : rôle `admin` (et `gestion` si/quand son périmètre d'édition est défini).
- **En développement :** bypass d'auth avec un utilisateur mock admin (flag d'environnement), pour ne pas bloquer l'avancement. L'auth réelle (Supabase Auth) est branchée à la fin (Étape 6).
- Données personnelles (Equipo) : écriture admin uniquement ; `sexo` optionnel.
- **Déploiement Supabase :** voir §9. Le schéma étant **déjà déployé** avec 2 rôles + RLS lecture/écriture, le passage à 3 rôles + confidentialité se fait par **migration incrémentale** (voir §10).

---

## 4. Pages

### 4.1 Inicio (Dashboard) — page d'entrée
Lecture via l'endpoint unique **`/api/snapshot`** (cache SWR, §6). Une ligne **« Gestión »** bascule entre deux modes : **Proyecto global** (par défaut) et **Subproyectos** (panneau dépliable).

**Toujours visible :**
- **Filtres** par composante (GP/EE/AyS/G) dans le header (haut à droite). *Effet de filtrage à câbler ultérieurement (boutons inertes pour l'instant).*
- **Agenda** : bande **scrollable horizontalement** des événements (passés **estompés** ; calée par défaut sur le **prochain à venir** ; clic sur le libellé « Agenda » réinitialise). Cartes colorées par composante ; événements sans nom ignorés.

**Mode « Proyecto global » :**
- **Grand tableau « Resumen »** (en-têtes sombres / lignes blanches) sur les 9 sous-projets. Groupes de colonnes : **Datos del edificio** (toujours 1er, non masquable, sans adresse) · **Progresión** (une colonne étroite par fase, hors « General » ; case colorée selon l'estado → **jauge**) · **Consumos** · **GEI** · **Costos** · **Beneficiarios** (calculs dérivés à l'affichage). Menu **« Columnas »** (cases : afficher/masquer les groupes) + **export CSV** ; ~10 lignes, défilement + redimensionnable.
- Sous le tableau, 3 blocs : **Datos técnicos** (totaux du projet, calculés sur les 9 sous-projets) · **Documentos** (sections **EE / AyS / G** depuis « Documentación de proyecto ») · 3ᵉ bloc (sans titre, à définir).

**Mode « Subproyectos » :**
- Sélecteur **Todos / Aeropuertos / Hospitales / Escuelas** + **tableau** des sous-projets + **carte de sélection** (clic = sélectionner ; **pas** de card de données — réservée à la page Mapa). Zoom carte = **Ctrl + molette**.
- Sous le tableau, blocs **Datos** (consommations avant/après kWh+kWh/m², réduction kWh+**%** ; **toggle factibilidad/proyecto** ; en haut à droite, **logos des mesures cochées** — voir §4.5) · **Documentos** (gestion du sous-projet, groupés par composante) · **Progreso** (fases colorées par estado, hors « General »). Puis blocs **Medidas EE / Medidas género / Otras medidas / Especificidades AyS** (reprennent les mesures du §4.5).
- En vue **groupe** (une typologie sélectionnée, sans bâtiment) : **Datos = totaux du groupe** ; Documentos/Progreso désactivés.

Permet un suivi **global ou par sous-projet**.

### 4.2 Mapa
- Carte **OpenStreetMap** (tuiles directement depuis OSM, sans egress propre). **Vue par défaut = Province de Santa Fe** (sur toute sa hauteur) ; zoom libre à la molette.
- Marqueurs aux coordonnées de chaque sous-projet, **couleur = typologie** (A/H/E).
- **Filtre par typologie** (Todos / Aeropuertos / Hospitales / Escuelas) + case **« Mostrar % de reducción »** (affiche le % de réduction en **étiquette permanente** à côté de chaque point).
- Au clic sur un point → **card** : nom, **adresse**, **superficie (m²)**, consommations théoriques avant/après (kWh et kWh/m²), réduction (kWh et **%** — le % **resalté**), **toggle factibilidad/proyecto** (désactivé tant que la fase « Proyecto ejecutivo » du sous-projet n'est pas démarrée).

### 4.3 Calendario
- Agenda type Google Calendar : créer des événements avec date, horaire, participants, thématique (dropdown = composantes), nom, modalité présentiel/virtuel + URL de connexion, case **Formación** + champ **URL documento**. Les événements alimentent l'Agenda du dashboard.
- *(Les **formations** — anciennement une sous-section « eventos » de Capacitaciones, supprimée — se créent désormais ici via la case **Formación**.)*

### 4.4 Admin (Admin uniquement) — base de données vivante
Onglets :
1. **Gestion de proyecto** → sous-sections **Documentation de projet** et **Gestion financière**.
2. **Calendario** (gestion des événements).
3. **Equipo** (CRUD personnes + gestion des entités).
4. **Capacitaciones** (EE / AyS / G ; **documents** uniquement — les formations sont désormais des événements du Calendario, §4.3).
5. **Gestion de subproyectos** (voir §4.5).

Chaque ligne éditable expose son **UID** (discret, **en début de ligne**, **sans bouton copier** — référence possible dans les prompts, mais minime ; peut ne jamais servir).

**Confidentialité par ligne.** Sur les tables documentaires/informationnelles, chaque ligne commence par une **checkbox rouge** « Confidencial » (champ `confidencial`, défaut `false`). Cochée, la ligne devient invisible pour les **Consultor** (filtrée par RLS) ; Admin et Gestión la voient toujours. Tables concernées :
- `documentacion_gp` (Documentation de projet ; porte aussi un champ **`componente`** GP/EE/AyS/G, utilisé par le bloc Documentos du dashboard global — §4.1)
- `gestion_financiera`
- `capacitaciones_documentos` *(la table `capacitaciones_eventos` a été **supprimée** — formations = événements du Calendario)*
- `gestion_lineas` (**uniquement les *Documentos*** ; les *Fases* ne sont pas confidentiables)
- *(à étendre si d'autres tables portent des documents ; pas les tables de métriques/référence)*

**Publication (`publicar`).** Les mêmes tables documentaires portent aussi un champ `publicar` (booléen, défaut `false`), **indépendant de `confidencial`** : il contrôle la visibilité sur les **pages publiques** (filtré à l'affichage, **pas** en RLS), alors que `confidencial` contrôle l'**accès** (RLS, Consultor exclu). Présenté comme un interrupteur neutre dans l'Admin (distinct de la checkbox rouge Confidencial).

### 4.5 Gestion de subproyectos (dans Admin)
Sélecteur de sous-projet groupé par sección :
- **Aeropuertos :** Aeropuerto Internacional de Rosario, Aeropuerto Sauce Viejo.
- **Hospitales :** Hospital del Centenario de Rosario, Hospital J. M. Cullen de Santa Fe.
- **Escuelas :** 5 sous-projets + bouton **« + Agregar escuela »** (UID auto `SUB-ESC-NNN`). Les **écoles** sont supprimables (bouton + confirmation) ; **pas** les aéroports/hôpitaux.

Par sous-projet, **4 sous-sections** :
- **Datos del edificio** — édition *par champ* : `nombre`, typologie (pastille A/H/E), `direccion`, `lat`, `lng`, `superficie_m2`, `notas`. Unités affichées dans les libellés (kWh, tCO₂, €, m²).
- **Datos de la factibilidad** — métriques scénario faisabilité + bénéficiaires (édition par champ ; NULL = « — », jamais 0).
- **Datos de proyecto** — métriques scénario projet (sans bénéficiaires) **+ Mesures du projet** : liste fixe de **9 mesures** (table `medidas`, pré-remplie par sous-projet) — 6 EE (*Aislación, Carpinterías, HVAC, Luminarias, Fotovoltaicos, Solar térmica*), *Género* (G), *Otras medidas* (sin componente), *AyS*. Chaque mesure : **case à cocher** (`activa`) + **texte libre** (`texto`) + **kWh/an économisés** (`kwh_anual`, **sauf AyS**). Logos : 4 EE **jaunes**, Fotovoltaicos/Solar térmica **bleus**, Género **violet**, Otras **bâtiment gris**, AyS **vert**.
- **Gestión del subproyecto** — deux sous-sections (voir `gestion_lineas` §3.3) : **Documentos** (table flexible, drag & drop, +/suppression) et **Fases** (liste fixe pré-remplie, 1 ligne par fase : nom en lecture seule + `estado` + `fecha inicio` + `fecha fin`).

### 4.6 Gestion des rôles (Admin uniquement)
- Lister les utilisateurs, assigner l'un des trois rôles : **Admin** / **Gestión** / **Consultor**.

---

## 5. Données initiales (seed) depuis « Tabla general.xlsx » (feuille *Resumen*)

> Valeurs à NULL = **donnée manquante** (afficher « — », pas 0). Coordonnées des aéroports et hôpitaux à obtenir par recherche web lors du seed.

| Sous-projet | UID | Typ. | Surf. m² | Dem. avant kWh | Dem. après kWh | GEI avant | GEI après | Coût EE € | Coût autres € |
|---|---|---|---|---|---|---|---|---|---|
| Aerop. Int. Rosario (Malvinas) | SUB-AIR | A | 8547 | 2 476 830 | 1 724 413 | 739 | 519 | 2 199 774 | — |
| Aerop. Sauce Viejo | SUB-ASV | A | 3276 | 1 022 879 | 736 942 | 284 | 195 | 506 023 | 0 |
| Hosp. del Centenario | SUB-CENTENARIO | H | 3962 | 2 347 919 | 1 532 271 | 567 | 379 | 2 947 437 | 1 188 600 |
| Hosp. J. M. Cullen | SUB-CULLEN | H | 1295 | 984 776 | 628 667 | 216 | 143 | 1 018 017 | 388 500 |
| Escuela 67 Pestalozzi | SUB-E67 | E | 1479.76 | 143 300 | 41 877 | 37.26 | 10.89 | 739 880 | 295 952 |
| Escuela 407 Flores | SUB-E407 | E | 2150 | 161 981 | 65 231 | 42.12 | 16.96 | 1 075 000 | 430 000 |
| Escuela 574 Pérez | SUB-E574 | E | 2713 | 230 225 | 76 588 | 59.86 | 19.91 | 1 356 500 | 542 600 |
| Escuela 1109 Yrigoyen | SUB-E1109 | E | 2558.15 | 202 836 | 80 275 | 52.74 | 20.87 | 1 279 075 | 511 630 |
| Escuela 331 Brown | SUB-E331 | E | 5089.19 | 393 598 | 159 699 | 102.34 | 41.52 | 2 544 595 | 1 017 838 |

**Bénéficiaires (scénario faisabilité)** — uniquement là où ils existent dans le Excel :
- SUB-AIR : personnel 268 (52 % fem.), usagers 2 461 208 (52 %), indirects 4 870 000 (52 %).
- SUB-ASV : personnel 824 400 (27 %), usagers 315 556 (52 %), indirects 687 000 (52 %).
- SUB-CENTENARIO : personnel 1 984 (64 %), usagers 412 018 (52 %), indirects 1 348 452 (52 %).
- SUB-CULLEN : personnel 2 195 (62 %), usagers 197 224 (52 %), indirects 568 259 (52 %).
- SUB-E67 : personnel 157 (79 %), usagers 10 017 (71 %), indirects 30 523 (52 %).
- SUB-E1109 : personnel 413, usagers 4 749, indirects 15 484 (52 %). (% fem. manquants → NULL.)
- SUB-E331 : usagers 25 251, indirects 75 754 (52 %). (Reste NULL.)
- SUB-E407, SUB-E574 : bénéficiaires NULL (manquants).

> *Note : les « datos de proyecto » sont initialisés vides sauf indication ; le Excel reflète la faisabilité.*

**Coordonnées géographiques des écoles** (onglet `ESC_Proceso seleccion (Junio 25` du Excel) — à charger dans le seed :
| Sous-projet | UID | Adresse | Latitude | Longitude |
|---|---|---|---|---|
| Escuela 67 Pestalozzi | SUB-E67 | Mendoza 3969, Echesortu, Rosario | -32.94461140 | -60.67859581 |
| Escuela 407 Flores (Pocho Lepratti) | SUB-E407 | 5 de Agosto y España, Las Flores, Rosario | -32.99057 *(approx.)* | -60.69833 *(approx.)* |
| Escuela 574 Pérez (Juan Carlos) | SUB-E574 | Las Casuarinas 306, Cabin 9, Pérez | -32.96837094 | -60.73702427 |
| Escuela 1109 Yrigoyen | SUB-E1109 | 12 de Octubre 9300, Yapeyú, Santa Fe | -31.57111634 | -60.74029039 |
| Escuela 331 Brown | SUB-E331 | 25 de Mayo 3762, Mariano Comas, Santa Fe | -31.63277064 | -60.70140506 |

> L'école 407 (Pocho Lepratti) est située à l'intersection 5 de Agosto y España (barrio Las Flores, Rosario) ; coordonnées **approximatives** déduites de l'adresse, à affiner si besoin. Les coordonnées des aéroports et hôpitaux restent à récupérer par recherche web lors du seed.

---

## 6. Optimisation (free-tier)

- **Un seul endpoint de snapshot** (`/api/snapshot`) qui renvoie le JSON nécessaire au dashboard + à la carte ; mis en cache (`stale-while-revalidate`), sans polling.
- **PWA lecture offline** : cacher le shell + le dernier snapshot. Bannière « Sin conexión — solo lectura » lorsque hors-ligne ; écriture désactivée.
- **Tuiles OSM** directes (sans egress propre).
- **Documents** = liens externes (pas de Storage).
- Pagination/lazy uniquement si une liste devient très grande (non prévu au départ).

---

## 7. Démarche de développement (bottom-up avec prototype)

1. **Schéma DB + RLS + seed** (données du Excel + énumérations + coordonnées web).
2. **Charte + layout** (sidebar, header logos, placeholders, constantes de couleur).
3. **Admin** (CRUD qui alimente tout ; UID visibles).
4. **Inicio (Dashboard) + Mapa** (lecture).
5. **PWA offline (lecture)**.
6. **Auth Supabase + RLS productif + gestion des rôles** (à la fin).

---

## 8. Points à confirmer / hors périmètre

- Contenu détaillé de la **zone basse** du dashboard (Datos EE, Datos économiques, Documentos, Progreso) → 2ᵉ phase.
- Structure de la **Gestion financière** → à définir.
- Coordonnées de l'école 407 (Pocho Lepratti) approximatives (déduites de l'adresse) à affiner ; coordonnées des aéroports/hôpitaux par web.
- Aucune fonction non demandée n'est incluse. Toute extension est validée au préalable.

---

## 9. Protocole de déploiement Supabase (entreprise)

> Règle organisationnelle. Le plan gratuit Supabase est limité à 2 projets ; l'entreprise en maintient deux :
> - **INTERNAL** — applications internes (ChantierAI, outils métier).
> - **External** — applications destinées aux clients ou partenaires. Les tables y sont **préfixées du nom de l'application** pour les identifier facilement.

- **Projet cible :** cette application est destinée à la Province de Santa Fe et à ses partenaires → projet **External**.
- **Préfixe des tables :** **`peebcoolsf_`** (l'entreprise a d'autres projets « peeb », d'où un préfixe spécifique à celui-ci). Ex. `peebcoolsf_subproyectos`, `peebcoolsf_metricas`, `peebcoolsf_perfiles`, …
- **Outil :** le **connecteur MCP Supabase** (pas la CLI `supabase link` / migrations). Lire au préalable les skills `supabase` et `supabase-postgres-best-practices`.
- **Création / itération :** utiliser **`execute_sql`** pendant toute la phase de développement. **Ne jamais utiliser `apply_migration`** pour itérer (cela écrit dans l'historique à chaque appel).
- **Confirmation :** lister les projets (`list_projects`) et confirmer le projet **External** avant toute écriture ; proposer le schéma complet (noms, colonnes, relations, index) avant exécution.
- **Sécurité :** activer le **RLS** et créer les **policies** pour **chaque** table dès la création (lecture pour authentifiés, écriture pour le rôle `admin` uniquement).
- **Import de données :** si le connecteur propose d'importer les données de la base locale, c'est accepté ; suivre les instructions de connexion le cas échéant (pas de copier-coller manuel de SQL en principe).

---

## 10. Évolution rôles + confidentialité (migration incrémentale sur schéma déployé)

> Le schéma `peebcoolsf_` est **déjà déployé** (Étape 1) avec 2 rôles ({admin, usuario}) et un RLS « lecture authentifiés / écriture admin ». Le passage à **3 rôles** + **confidentialité par ligne** se fait par migration incrémentale, sans recréer les tables ni re-seeder, via `execute_sql` (idempotent autant que possible).

**Changements à appliquer :**
1. **Rôles** : faire évoluer la contrainte de `peebcoolsf_perfiles.rol` de `{admin, usuario}` vers `{admin, gestion, consultor}`. Définir la stratégie pour d'éventuelles lignes `usuario` existantes (aucune en base à ce stade — `perfiles` est vide). Mettre à jour la fonction `is_admin()` si besoin et **ajouter une fonction `current_rol()`** (ou équivalent) en schéma privé `peebcoolsf_private` pour exposer le rôle courant aux policies.
2. **Champ `confidencial`** : ajouter `confidencial boolean not null default false` sur les tables documentaires listées en §4.4 (`documentacion_gp`, `gestion_financiera`, `capacitaciones_documentos`, `capacitaciones_eventos`, `gestion_lineas`).
3. **Policies RLS** : sur ces tables, la policy de lecture doit autoriser :
   - `admin` et `gestion` → toutes les lignes ;
   - `consultor` → uniquement les lignes où `confidencial = false`.
   Les autres tables (métriques, sous-projets, référentiels, équipe, événements) restent en lecture pour tous les rôles authentifiés, sauf décision contraire ultérieure.
4. **Écriture** : conserver `admin` ; le périmètre d'écriture de `gestion` est **à définir** (par défaut : pas d'écriture).
5. **Index** : ajouter un index sur `confidencial` uniquement si nécessaire (faible cardinalité → probablement inutile ; à évaluer).

**Procédure :** proposer le diff SQL complet (ALTER + nouvelles policies) **avant exécution**, l'appliquer via `execute_sql` par lots idempotents, puis fournir un **rapport `.md`** (état des rôles, champ `confidencial` présent par table, matrice rôle × table × lecture/écriture) pour validation. Mettre à jour les fichiers SQL locaux du repo en conséquence.
