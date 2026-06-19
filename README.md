# PEEB Cool — Santa Fe

Application web de suivi de projet PEEB (Programa de Eficiencia Energética en Edificios) — Province de Santa Fe, Argentine. Assistance technique Assemblage Ingénierie, financement AFD.

**Stack :** Next.js (App Router) · TypeScript · Tailwind CSS · Supabase (PostgreSQL + RLS + Auth) · Vercel

---

## Prise en main

### Prérequis
- Node.js 18+
- Git + GitHub CLI (`gh`)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (pour les migrations)

### Installation

```bash
git clone https://github.com/mbhoyroo/peeb-cool-santafe.git
cd peeb-cool-santafe
npm install
```

### Variables d'environnement

```bash
cp .env.local.example .env.local
# Éditer .env.local avec les valeurs du projet Supabase
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anonyme (publique) Supabase |
| `NEXT_PUBLIC_DEV_AUTH_BYPASS` | `true` en dev — contourne l'auth réelle (mock admin) |

### Lancer en développement

```bash
npm run dev
# → http://localhost:3000
```

---

## Base de données

### Migrations SQL

Les migrations sont dans `supabase/migrations/`, à appliquer dans l'ordre numérique.

```
supabase/migrations/
  20250618000001_initial_schema.sql   — toutes les tables + triggers
  20250618000002_rls.sql              — politiques RLS
```

**Via Supabase CLI** (une fois le projet Supabase configuré) :
```bash
supabase link --project-ref <ref>
supabase db push
```

**Manuellement** : copier-coller chaque fichier dans l'éditeur SQL de la console Supabase, dans l'ordre.

### Seed

```bash
# Via Supabase CLI (réinitialise, applique migrations + seed)
supabase db reset

# Manuellement : exécuter supabase/seed.sql dans l'éditeur SQL Supabase
```

Le seed insère :
- Énumérations (composantes, typologies, phases, états, types de ligne)
- 9 sous-projets avec métriques de faisabilité et coordonnées GPS
- Documentation GP (6 lignes initiales)
- Capacitaciones (3 documents × 3 sous-sections : EE / AyS / G)
- Gestion de sous-projet : 4 lignes par sous-projet (Auditoria, Planos pdf, Proyecto ejecutivo, Pliego)

### Vérification

Exécuter `scripts/verify_seed.sql` dans l'éditeur SQL Supabase pour valider que le seed correspond aux données de la §5 du CDC.

---

## Logos (placeholders)

Déposer les fichiers finaux dans `public/logos/` :

| Fichier | Usage |
|---|---|
| `public/logos/assemblage.svg` | Logo Assemblage Ingénierie — barre latérale |
| `public/logos/assemblage-a.svg` | Filigrane « .A » — bas de la sidebar |
| `public/logos/afd.svg` | Logo AFD — header |
| `public/logos/santafe.svg` | Logo Province de Santa Fe — header |

Tant que les fichiers sont absents, l'interface affiche des placeholders visuels (nom du fichier + bordure pointillée).

---

## Structure du projet

```
peeb-cool-santafe/
├── app/                          # Next.js App Router (pages, layouts)
├── lib/
│   └── constants.ts              # Couleurs, libellés, règles de contraste (étape 2)
├── public/
│   └── logos/                    # Logos (placeholders initialement)
├── supabase/
│   ├── migrations/               # Migrations SQL (ordre numérique)
│   └── seed.sql                  # Données initiales
├── scripts/
│   └── verify_seed.sql           # Requête de vérification du seed
├── CAHIER_DES_CHARGES_FR.md      # Spécification de référence
└── .env.local.example            # Template de configuration
```

---

## Démarche de développement (bottom-up)

| # | Étape | État |
|---|---|---|
| 1 | Schéma DB + RLS + seed | ✅ |
| 2 | Charte + layout (sidebar, header, constantes couleur) | — |
| 3 | Page Admin (CRUD, UID visibles) | — |
| 4 | Inicio (Dashboard) + Mapa | — |
| 5 | PWA offline (lecture) | — |
| 6 | Auth Supabase + RLS productif + gestion des rôles | — |
