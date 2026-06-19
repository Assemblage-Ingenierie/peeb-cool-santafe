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

**Utilisateurs :** ~40 personnes. Deux rôles : **admin** (accès total + page Admin + gestion des rôles) et **usuario** (lecture seule du dashboard, de la carte et du calendrier).

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
- **Header** supérieur : ligne avec les logos **AFD** et **Province de Santa Fe** (placeholders), et à droite les filtres par composante (GP, EE, AyS, G).

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

> Principe : schéma **relationnel typé** pour tout ce qui est consulté/filtré (sous-projets, métriques, événements, équipe), et tables **« ligne flexible » type Airtable** uniquement là où c'est nécessaire (gestion de sous-projet, formations, documentation GP). Chaque ligne visible par l'utilisateur possède un **UID lisible et stable** (clé métier) en plus de l'UUID technique, afin de pouvoir le référencer dans les prompts ultérieurs.

### 3.1 Convention d'UID lisibles
- Sous-projets : `SUB-AIR`, `SUB-ASV`, `SUB-CENTENARIO`, `SUB-CULLEN`, `SUB-E67`, `SUB-E407`, `SUB-E574`, `SUB-E1109`, `SUB-E331`, …
- Équipe : `EQ-001`, `EQ-002`, …
- Entités : `ENT-001`, …
- Événements calendrier : `EVT-0001`, …
- Documentation GP : `GP-DOC-MANUAL`, `GP-DOC-PAC`, `GP-DOC-MV`, `GP-DOC-PRESUP`, `GP-DOC-INI`, `GP-DOC-PER1`, …
- Formations : `CAP-EE-01`, `CAP-AYS-01`, `CAP-G-01`, … (documents) et `CAPEVT-…` (événements)
- Gestion de sous-projet (lignes) : `GEST-<SUB>-<n>`, ex. `GEST-AIR-0001`.

### 3.2 Tables de référence (énumérations)
- `componentes` (GP, EE, AyS, G) — libellé + couleur (ou constante en code).
- `tipologias` (A, H, E) — libellé + couleur.
- `fases` (chronologiques) : `Estudios preliminares`, `Proyecto ejecutivo`, `Licitacion`, `Obra`, `General`.
- `estados` : `En proceso` (jaune), `Terminado` (vert clair), + valeur vide autorisée.
- `tipo_linea` : `Documento`, `Etapa`.

### 3.3 Tables principales

**`subproyectos`**
- `uid` (PK métier), `nombre`, `tipologia` (A/H/E), `seccion` (regroupement : Aeropuertos / Hospitales / Escuelas), `orden`.
- **Datos del edificio :** `direccion`, `lat`, `lng`, `superficie_m2`, (+ champs extensibles plus tard).

**`metricas`** (1 ligne par sous-projet et par **scénario**)
- `subproyecto_uid` (FK), `escenario` ∈ {`faisabilidad`, `proyecto`}.
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
- `uid`, `nombre`, `fecha`, `hora_inicio`, `hora_fin`, `participantes` (multi, réfs vers `equipo`), `componente` (dropdown), `modalidad` ∈ {`Presencial`, `Virtual`}, `lugar`, `url_conexion` (si virtuel). Apparaissent dans le dashboard (Agenda).

**`documentacion_gp`** (Gestion de proyecto → Documentation)
- `uid`, `nombre_documento` (éditable), `url`. Lignes initiales : Manual Operativo, Plan de adquisiciones, Plan de M&V, Presupuesto, Informe de inicio, Informe periódico 1.

**`gestion_financiera`** (Gestion de proyecto → structure minimale ; contenu à définir)
- Réserver une table/section ; champs à préciser ultérieurement.

**`capacitaciones`** (3 sous-sections **confirmées** : `Eficiencia energética` (EE), `Ambiental y social` (AyS), `Género` (G))
- Type `documento` : `uid`, `subseccion`, `componente` (dropdown avec pastille de couleur), `url`.
- Type `evento` : `uid`, `subseccion`, `componente`, `entidades` (multi, réfs vers `entidades`), `participantes` (multi, réfs vers `equipo`), `fecha_hora`, `documento_uid` (dropdown, relie à un document de la même section).
- Seed : pour chaque sous-section, lignes `Formation 1`, `Formation 2`, `Formation 3` (titre éditable).

**`gestion_lineas`** (Gestion de sous-projet — style Airtable)
- `uid`, `subproyecto_uid` (FK), `titulo` (éditable), `orden` (drag & drop), `tipo_linea` (Documento/Etapa/vide), `componente` (dropdown avec pastille/vide), `url` (actif seulement si tipo=Documento ; **grisé/désactivé** si Etapa ou vide), `estado` (En proceso/Terminado/vide), `fecha`, `fase` (dropdown chronologique).
- Seed par sous-projet : `Auditoria`, `Planos pdf`, `Proyecto ejecutivo`, `Pliego`.
- Bouton **+** pour ajouter des lignes.

### 3.4 Sécurité (RLS dès le départ)
- Activer le **Row Level Security** sur toutes les tables dès le jour 1.
- Lecture : tous les utilisateurs authentifiés.
- Écriture : rôle `admin` uniquement.
- Table `perfiles` (`user_id`, `rol` ∈ {admin, usuario}).
- **En développement :** bypass d'auth avec un utilisateur mock admin (flag d'environnement), pour ne pas bloquer l'avancement. L'auth réelle (Supabase Auth) est branchée à la fin.
- Données personnelles (Equipo) : écriture admin uniquement ; `sexo` optionnel.

---

## 4. Pages

### 4.1 Inicio (Dashboard) — page d'entrée
Layout selon la capture :
- **Filtres** par composante (GP/EE/AyS/G) en haut à droite.
- **Agenda** : cartes des prochains événements (nom, date/heure, entités/participants, lieu), avec la couleur de la composante.
- **Sous-projets** : sélecteur latéral (Todos / Aeropuertos / Hospitales / Escuelas) + liste des sous-projets.
- **Tableau central** : lignes par sous-projet (placeholder pour l'instant).
- **Carte** OpenStreetMap intégrée (encart de droite).
- **Zone basse** (fond foncé) : change selon le sous-projet et/ou le filtre sélectionné. Blocs **Datos** (Datos de eficiencia energética — à définir ; Datos económicos — à définir), **Documentos** (A/B/C/D — à définir), **Progreso** (à définir). *Contenu détaillé en 2ᵉ phase.*

Permet un suivi **global ou par sous-projet**, dans les deux cas **filtrable par composante**.

### 4.2 Mapa
- Carte **OpenStreetMap** (tuiles directement depuis OSM, sans passer par l'egress propre).
- Marqueurs aux coordonnées de chaque sous-projet, **couleur = typologie** (A/H/E).
- Au clic sur un point → **card** avec : consommations théoriques avant et après (kWh et kWh/m²), réduction (kWh et **%**). La **réduction en %** est l'information mise en valeur (resaltée).

### 4.3 Calendario
- Agenda type Google Calendar : créer des événements avec date, horaire, participants, thématique (dropdown = composantes), nom, modalité présentiel/virtuel + URL de connexion. Les événements alimentent l'Agenda du dashboard.

### 4.4 Admin (admins uniquement) — base de données vivante
Onglets :
1. **Gestion de proyecto** → sous-sections **Documentation de projet** et **Gestion financière**.
2. **Calendario** (gestion des événements).
3. **Equipo** (CRUD personnes + gestion des entités).
4. **Capacitaciones** (EE / AyS / G ; ajouter documents et événements).
5. **Gestion de subproyectos** (voir §4.5).

Chaque ligne éditable expose son **UID** (visible/copiable) pour référencement dans les prompts.

### 4.5 Gestion de subproyectos (dans Admin)
Regroupement :
- **Aeropuertos :** Aeropuerto Internacional de Rosario, Aeropuerto Sauce Viejo.
- **Hospitales :** Hospital del Centenario de Rosario, Hospital J. M. Cullen de Santa Fe.
- **Escuelas :** 5 sous-projets + possibilité d'**ajouter des écoles** (nouveaux sous-projets).

Par sous-projet, sous-sections :
- **Datos del edificio** (typologie avec pastille, adresse, coordonnées, surface, + extensible).
- **Datos de la faisabilidad** (métriques scénario `faisabilidad` + bénéficiaires).
- **Datos de proyecto** (métriques scénario `proyecto` ; sans bénéficiaires).
- **Gestión del subproyecto** (table flexible, voir `gestion_lineas`).

### 4.6 Gestion des rôles (admins uniquement)
- Lister les utilisateurs, assigner le rôle admin/usuario.

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
