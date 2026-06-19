# Schéma `peebcoolsf_` — PEEB Cool Santa Fe

> **Cible :** projet Supabase **EXTERNAL** (`grnkbnldfzdzrgleorra`, eu-west-3, PG 17.6) — org *Assemblage Ingenierie*.
> Toutes les tables sont préfixées `peebcoolsf_` (le projet EXTERNAL est partagé entre plusieurs apps clients/partenaires).
> Document de **validation avant exécution**. Exécution prévue via `execute_sql` (jamais `apply_migration` en phase dev), puis **pause avant le seed §5**.

**Total à exécuter** : 16 `CREATE TABLE` + 2 fonctions + 1 schéma + 7 index + 9 triggers + 16 `ENABLE RLS` + 32 policies.

---

## Section 0 — Schéma privé + fonctions

```sql
-- Schéma non exposé pour les fonctions SECURITY DEFINER (best practice)
create schema if not exists peebcoolsf_private;

-- is_admin() : lit perfiles en bypass RLS (anti-récursion) ; search_path vide (anti-injection)
create or replace function peebcoolsf_private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.peebcoolsf_perfiles
    where user_id = auth.uid() and rol = 'admin'
  );
$$;

-- Maintien automatique de updated_at
create or replace function peebcoolsf_private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
```

---

## Section 1 — Tables de référence (énumérations) — 5

```sql
create table public.peebcoolsf_componentes (
  code        text primary key,                 -- 'GP' | 'EE' | 'AyS' | 'G'
  nombre      text    not null,
  color       text    not null,
  texto_claro boolean not null default false     -- true = texte clair sur fond foncé
);

create table public.peebcoolsf_tipologias (
  code        text primary key,                 -- 'A' | 'H' | 'E'
  nombre      text    not null,
  color       text    not null,
  texto_claro boolean not null default false
);

create table public.peebcoolsf_fases (
  code   text     primary key,                  -- estudios_preliminares, proyecto_ejecutivo, licitacion, obra, general
  nombre text     not null,
  orden  smallint not null
);

create table public.peebcoolsf_estados (
  code   text primary key,                      -- en_proceso | terminado
  nombre text not null,
  color  text not null
);

create table public.peebcoolsf_tipo_linea (
  code   text primary key,                      -- documento | etapa
  nombre text not null
);
```

---

## Section 2 — Tables principales — 11

```sql
-- Profils / rôles de CETTE app (FK vers auth.users partagé du projet EXTERNAL)
create table public.peebcoolsf_perfiles (
  id         uuid primary key default gen_random_uuid(),   -- PK technique
  user_id    uuid unique not null references auth.users(id) on delete cascade,  -- FK
  rol        text not null check (rol in ('admin','usuario')),
  created_at timestamptz not null default now()
);

create table public.peebcoolsf_entidades (
  id         uuid primary key default gen_random_uuid(),   -- PK technique
  uid        text unique not null,                         -- clé métier (ENT-001…)
  nombre     text not null,
  created_at timestamptz not null default now()
);

create table public.peebcoolsf_subproyectos (
  id            uuid primary key default gen_random_uuid(),         -- PK technique
  uid           text unique not null,                               -- clé métier (SUB-AIR…)
  nombre        text not null,
  tipologia     text not null references public.peebcoolsf_tipologias(code),   -- FK
  seccion       text not null check (seccion in ('Aeropuertos','Hospitales','Escuelas')),
  orden         smallint not null,
  direccion     text,
  lat           double precision,
  lng           double precision,
  superficie_m2 double precision,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 1 ligne par (sous-projet × scénario). TOUS les numériques nullables, AUCUN default.
create table public.peebcoolsf_metricas (
  id                       uuid primary key default gen_random_uuid(),         -- PK technique
  subproyecto_uid          text not null references public.peebcoolsf_subproyectos(uid) on delete cascade,  -- FK
  escenario                text not null check (escenario in ('faisabilidad','proyecto')),
  -- Consommations (kWh)
  demanda_kwh              double precision,
  demanda_despues_kwh      double precision,
  -- GEI (tCO2)
  gei_antes_tco2           double precision,
  gei_despues_tco2         double precision,
  -- Coûts (EUR)
  costo_ee_eur             double precision,
  costo_otras_eur          double precision,
  -- Bénéficiaires (scénario faisabilidad uniquement)
  benef_personal           integer,
  benef_personal_pct_muj   double precision,
  benef_usuarios           integer,
  benef_usuarios_pct_muj   double precision,
  benef_indirectos         integer,
  benef_indirectos_pct_muj double precision,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (subproyecto_uid, escenario)            -- → index composite (sert subproyecto_uid + escenario)
);

create table public.peebcoolsf_equipo (
  id          uuid primary key default gen_random_uuid(),    -- PK technique
  uid         text unique not null,                          -- clé métier (EQ-001…)
  apellido    text not null,
  nombre      text not null,
  entidad_uid text references public.peebcoolsf_entidades(uid),     -- FK
  rol         text,
  componente  text references public.peebcoolsf_componentes(code),  -- FK
  telefono    text,
  mail        text,
  sexo        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.peebcoolsf_eventos (
  id            uuid primary key default gen_random_uuid(),  -- PK technique
  uid           text unique not null,                        -- clé métier (EVT-0001…)
  nombre        text not null,
  fecha         date not null,
  hora_inicio   time,
  hora_fin      time,
  participantes text[] not null default '{}',                -- UIDs equipo (multi)
  componente    text references public.peebcoolsf_componentes(code),  -- FK
  modalidad     text check (modalidad in ('Presencial','Virtual')),
  lugar         text,
  url_conexion  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.peebcoolsf_documentacion_gp (
  id               uuid primary key default gen_random_uuid(),   -- PK technique
  uid              text unique not null,                         -- clé métier (GP-DOC-MANUAL…)
  nombre_documento text not null,
  url              text,
  orden            smallint,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table public.peebcoolsf_gestion_financiera (
  id         uuid primary key default gen_random_uuid(),  -- PK technique
  uid        text unique not null,                        -- clé métier
  titulo     text,
  url        text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.peebcoolsf_capacitaciones_documentos (
  id         uuid primary key default gen_random_uuid(),  -- PK technique
  uid        text unique not null,                        -- clé métier (CAP-EE-01…)
  subseccion text not null check (subseccion in ('EE','AyS','G')),
  componente text references public.peebcoolsf_componentes(code),  -- FK
  titulo     text not null,
  url        text,
  orden      smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.peebcoolsf_capacitaciones_eventos (
  id            uuid primary key default gen_random_uuid(),  -- PK technique
  uid           text unique not null,                        -- clé métier (CAPEVT-…)
  subseccion    text not null check (subseccion in ('EE','AyS','G')),
  componente    text references public.peebcoolsf_componentes(code),                       -- FK
  entidades     text[] not null default '{}',                -- UIDs entidades (multi)
  participantes text[] not null default '{}',                -- UIDs equipo (multi)
  fecha_hora    timestamptz,
  documento_uid text references public.peebcoolsf_capacitaciones_documentos(uid),          -- FK
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.peebcoolsf_gestion_lineas (
  id              uuid primary key default gen_random_uuid(),  -- PK technique
  uid             text unique not null,                        -- clé métier (GEST-AIR-0001…)
  subproyecto_uid text not null references public.peebcoolsf_subproyectos(uid) on delete cascade,  -- FK
  titulo          text not null,
  orden           smallint not null default 0,                 -- drag & drop
  tipo_linea      text references public.peebcoolsf_tipo_linea(code),    -- FK
  componente      text references public.peebcoolsf_componentes(code),   -- FK
  url             text,                                        -- actif si tipo_linea='documento' (règle UI)
  estado          text references public.peebcoolsf_estados(code),       -- FK
  fecha           date,
  fase            text references public.peebcoolsf_fases(code),         -- FK
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
```

---

## Section 3 — Index

```sql
-- FK + colonnes filtrées
create index idx_peebcoolsf_gestion_lineas_subproyecto on public.peebcoolsf_gestion_lineas(subproyecto_uid);
create index idx_peebcoolsf_gestion_lineas_componente  on public.peebcoolsf_gestion_lineas(componente);
create index idx_peebcoolsf_eventos_fecha              on public.peebcoolsf_eventos(fecha);
create index idx_peebcoolsf_eventos_componente         on public.peebcoolsf_eventos(componente);
create index idx_peebcoolsf_capevt_documento           on public.peebcoolsf_capacitaciones_eventos(documento_uid);
create index idx_peebcoolsf_equipo_entidad             on public.peebcoolsf_equipo(entidad_uid);
create index idx_peebcoolsf_equipo_componente          on public.peebcoolsf_equipo(componente);

-- subproyecto_uid + escenario : déjà couverts par unique(subproyecto_uid, escenario) sur metricas.
-- Pas d'index escenario isolé (2 valeurs / 18 lignes → inutile). À ajouter sur demande.
```

---

## Section 4 — Triggers `updated_at`

```sql
create trigger trg_sub_upd    before update on public.peebcoolsf_subproyectos              for each row execute function peebcoolsf_private.set_updated_at();
create trigger trg_met_upd    before update on public.peebcoolsf_metricas                  for each row execute function peebcoolsf_private.set_updated_at();
create trigger trg_eq_upd     before update on public.peebcoolsf_equipo                    for each row execute function peebcoolsf_private.set_updated_at();
create trigger trg_evt_upd    before update on public.peebcoolsf_eventos                   for each row execute function peebcoolsf_private.set_updated_at();
create trigger trg_docgp_upd  before update on public.peebcoolsf_documentacion_gp          for each row execute function peebcoolsf_private.set_updated_at();
create trigger trg_gf_upd     before update on public.peebcoolsf_gestion_financiera        for each row execute function peebcoolsf_private.set_updated_at();
create trigger trg_capdoc_upd before update on public.peebcoolsf_capacitaciones_documentos for each row execute function peebcoolsf_private.set_updated_at();
create trigger trg_capevt_upd before update on public.peebcoolsf_capacitaciones_eventos    for each row execute function peebcoolsf_private.set_updated_at();
create trigger trg_gl_upd     before update on public.peebcoolsf_gestion_lineas            for each row execute function peebcoolsf_private.set_updated_at();
```

---

## Section 5 — RLS + policies (explicites, par table)

```sql
-- Activation RLS sur les 16 tables
alter table public.peebcoolsf_componentes               enable row level security;
alter table public.peebcoolsf_tipologias                enable row level security;
alter table public.peebcoolsf_fases                     enable row level security;
alter table public.peebcoolsf_estados                   enable row level security;
alter table public.peebcoolsf_tipo_linea                enable row level security;
alter table public.peebcoolsf_perfiles                  enable row level security;
alter table public.peebcoolsf_entidades                 enable row level security;
alter table public.peebcoolsf_subproyectos              enable row level security;
alter table public.peebcoolsf_metricas                  enable row level security;
alter table public.peebcoolsf_equipo                    enable row level security;
alter table public.peebcoolsf_eventos                   enable row level security;
alter table public.peebcoolsf_documentacion_gp          enable row level security;
alter table public.peebcoolsf_gestion_financiera        enable row level security;
alter table public.peebcoolsf_capacitaciones_documentos enable row level security;
alter table public.peebcoolsf_capacitaciones_eventos    enable row level security;
alter table public.peebcoolsf_gestion_lineas            enable row level security;

-- === Tables de référence : lecture authentifiés / écriture admin ===
create policy "componentes_sel" on public.peebcoolsf_componentes for select to authenticated using (true);
create policy "componentes_admin" on public.peebcoolsf_componentes for all to authenticated
  using ((select peebcoolsf_private.is_admin())) with check ((select peebcoolsf_private.is_admin()));

create policy "tipologias_sel" on public.peebcoolsf_tipologias for select to authenticated using (true);
create policy "tipologias_admin" on public.peebcoolsf_tipologias for all to authenticated
  using ((select peebcoolsf_private.is_admin())) with check ((select peebcoolsf_private.is_admin()));

create policy "fases_sel" on public.peebcoolsf_fases for select to authenticated using (true);
create policy "fases_admin" on public.peebcoolsf_fases for all to authenticated
  using ((select peebcoolsf_private.is_admin())) with check ((select peebcoolsf_private.is_admin()));

create policy "estados_sel" on public.peebcoolsf_estados for select to authenticated using (true);
create policy "estados_admin" on public.peebcoolsf_estados for all to authenticated
  using ((select peebcoolsf_private.is_admin())) with check ((select peebcoolsf_private.is_admin()));

create policy "tipo_linea_sel" on public.peebcoolsf_tipo_linea for select to authenticated using (true);
create policy "tipo_linea_admin" on public.peebcoolsf_tipo_linea for all to authenticated
  using ((select peebcoolsf_private.is_admin())) with check ((select peebcoolsf_private.is_admin()));

-- === peebcoolsf_perfiles : lecture (propre ligne OU admin) / écriture admin ===
create policy "perfiles_sel" on public.peebcoolsf_perfiles for select to authenticated
  using ((select auth.uid()) = user_id or (select peebcoolsf_private.is_admin()));
create policy "perfiles_admin" on public.peebcoolsf_perfiles for all to authenticated
  using ((select peebcoolsf_private.is_admin())) with check ((select peebcoolsf_private.is_admin()));

-- === Tables opérationnelles : lecture authentifiés / écriture admin ===
create policy "entidades_sel" on public.peebcoolsf_entidades for select to authenticated using (true);
create policy "entidades_admin" on public.peebcoolsf_entidades for all to authenticated
  using ((select peebcoolsf_private.is_admin())) with check ((select peebcoolsf_private.is_admin()));

create policy "subproyectos_sel" on public.peebcoolsf_subproyectos for select to authenticated using (true);
create policy "subproyectos_admin" on public.peebcoolsf_subproyectos for all to authenticated
  using ((select peebcoolsf_private.is_admin())) with check ((select peebcoolsf_private.is_admin()));

create policy "metricas_sel" on public.peebcoolsf_metricas for select to authenticated using (true);
create policy "metricas_admin" on public.peebcoolsf_metricas for all to authenticated
  using ((select peebcoolsf_private.is_admin())) with check ((select peebcoolsf_private.is_admin()));

create policy "equipo_sel" on public.peebcoolsf_equipo for select to authenticated using (true);
create policy "equipo_admin" on public.peebcoolsf_equipo for all to authenticated
  using ((select peebcoolsf_private.is_admin())) with check ((select peebcoolsf_private.is_admin()));

create policy "eventos_sel" on public.peebcoolsf_eventos for select to authenticated using (true);
create policy "eventos_admin" on public.peebcoolsf_eventos for all to authenticated
  using ((select peebcoolsf_private.is_admin())) with check ((select peebcoolsf_private.is_admin()));

create policy "documentacion_gp_sel" on public.peebcoolsf_documentacion_gp for select to authenticated using (true);
create policy "documentacion_gp_admin" on public.peebcoolsf_documentacion_gp for all to authenticated
  using ((select peebcoolsf_private.is_admin())) with check ((select peebcoolsf_private.is_admin()));

create policy "gestion_financiera_sel" on public.peebcoolsf_gestion_financiera for select to authenticated using (true);
create policy "gestion_financiera_admin" on public.peebcoolsf_gestion_financiera for all to authenticated
  using ((select peebcoolsf_private.is_admin())) with check ((select peebcoolsf_private.is_admin()));

create policy "capdoc_sel" on public.peebcoolsf_capacitaciones_documentos for select to authenticated using (true);
create policy "capdoc_admin" on public.peebcoolsf_capacitaciones_documentos for all to authenticated
  using ((select peebcoolsf_private.is_admin())) with check ((select peebcoolsf_private.is_admin()));

create policy "capevt_sel" on public.peebcoolsf_capacitaciones_eventos for select to authenticated using (true);
create policy "capevt_admin" on public.peebcoolsf_capacitaciones_eventos for all to authenticated
  using ((select peebcoolsf_private.is_admin())) with check ((select peebcoolsf_private.is_admin()));

create policy "gestion_lineas_sel" on public.peebcoolsf_gestion_lineas for select to authenticated using (true);
create policy "gestion_lineas_admin" on public.peebcoolsf_gestion_lineas for all to authenticated
  using ((select peebcoolsf_private.is_admin())) with check ((select peebcoolsf_private.is_admin()));
```

---

## Points à valider

| Élément | Confirmation |
|---|---|
| **16 tables** toutes préfixées `peebcoolsf_` | ✅ |
| **PK** : `id uuid` (technique) + `uid text unique` (métier) sur tables opérationnelles ; `code` PK sur tables de référence | ✅ |
| **FK** : toutes définies (voir commentaires `-- FK`) | ✅ |
| **Index** : FK + filtrés (`subproyecto_uid`, `componente`, `fecha`) ; `subproyecto_uid`+`escenario` via UNIQUE composite | ✅ |
| **`metricas.escenario`** ∈ `{faisabilidad, proyecto}`, `not null` | ✅ |
| **`metricas`** : 12 champs numériques **tous nullables, aucun `default`** (donc jamais `0` implicite) | ✅ |
| **RLS** activé sur les 16 tables ; lecture = `authenticated`, écriture = `admin` (via `is_admin()`) | ✅ |

---

## Notes

- **Bootstrap admin** : `perfiles` est vide au départ → tant qu'aucun admin n'y est inscrit, l'écriture via l'app est verrouillée. C'est voulu : le seed passe par `execute_sql` (rôle privilégié, bypass RLS), et le 1ᵉʳ admin sera créé à l'Étape 6 (auth réelle).
- **Accès lecture en dev** : avec lecture `to authenticated` (strict), le navigateur en bypass dev (rôle `anon`) ne lit pas en direct. Le dashboard en dev (Étape 4) lira via l'endpoint serveur `/api/snapshot` avec la `service_role` (CDC §6). RLS gardé strict, sans policy `anon` temporaire.
- `apply_migration` **non utilisé** — tout en `execute_sql`.

---

🛑 **Aucune exécution effectuée.** Après validation : création (tables + index + triggers + RLS + policies) via `execute_sql`, **puis pause avant le seed §5**.
