-- ============================================================
-- Migration 001 — Schéma initial PEEB Cool Santa Fe
-- Déployé sur le projet Supabase EXTERNAL (tables préfixées peebcoolsf_).
-- Reflet du déploiement réel effectué via le connecteur MCP (execute_sql).
-- Ordre d'exécution : schéma privé + set_updated_at → tables → is_admin → index → triggers.
-- ============================================================

-- Schéma non exposé pour les fonctions SECURITY DEFINER (best practice)
create schema if not exists peebcoolsf_private;

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

-- ============================================================
-- Tables de référence (énumérations)
-- ============================================================
create table public.peebcoolsf_componentes (
  code        text primary key,
  nombre      text    not null,
  color       text    not null,
  texto_claro boolean not null default false   -- true = texte clair sur fond foncé
);

create table public.peebcoolsf_tipologias (
  code        text primary key,
  nombre      text    not null,
  color       text    not null,
  texto_claro boolean not null default false
);

create table public.peebcoolsf_fases (
  code   text     primary key,
  nombre text     not null,
  orden  smallint not null
);

create table public.peebcoolsf_estados (
  code   text primary key,
  nombre text not null,
  color  text not null
);

create table public.peebcoolsf_tipo_linea (
  code   text primary key,
  nombre text not null
);

-- ============================================================
-- Tables principales
-- ============================================================
create table public.peebcoolsf_perfiles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid unique not null references auth.users(id) on delete cascade,
  rol        text not null check (rol in ('admin','usuario')),
  created_at timestamptz not null default now()
);

create table public.peebcoolsf_entidades (
  id         uuid primary key default gen_random_uuid(),
  uid        text unique not null,
  nombre     text not null,
  created_at timestamptz not null default now()
);

create table public.peebcoolsf_subproyectos (
  id            uuid primary key default gen_random_uuid(),
  uid           text unique not null,
  nombre        text not null,
  tipologia     text not null references public.peebcoolsf_tipologias(code),
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
  id                       uuid primary key default gen_random_uuid(),
  subproyecto_uid          text not null references public.peebcoolsf_subproyectos(uid) on delete cascade,
  escenario                text not null check (escenario in ('faisabilidad','proyecto')),
  demanda_kwh              double precision,
  demanda_despues_kwh      double precision,
  gei_antes_tco2           double precision,
  gei_despues_tco2         double precision,
  costo_ee_eur             double precision,
  costo_otras_eur          double precision,
  benef_personal           integer,
  benef_personal_pct_muj   double precision,
  benef_usuarios           integer,
  benef_usuarios_pct_muj   double precision,
  benef_indirectos         integer,
  benef_indirectos_pct_muj double precision,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (subproyecto_uid, escenario)
);

create table public.peebcoolsf_equipo (
  id          uuid primary key default gen_random_uuid(),
  uid         text unique not null,
  apellido    text not null,
  nombre      text not null,
  entidad_uid text references public.peebcoolsf_entidades(uid),
  rol         text,
  componente  text references public.peebcoolsf_componentes(code),
  telefono    text,
  mail        text,
  sexo        text check (sexo in ('F','M','X') or sexo is null),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.peebcoolsf_eventos (
  id            uuid primary key default gen_random_uuid(),
  uid           text unique not null,
  nombre        text not null,
  fecha         date not null,
  hora_inicio   time,
  hora_fin      time,
  participantes text[] not null default '{}',          -- UIDs equipo
  componente    text references public.peebcoolsf_componentes(code),
  modalidad     text check (modalidad in ('Presencial','Virtual')),
  lugar         text,
  url_conexion  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.peebcoolsf_documentacion_gp (
  id               uuid primary key default gen_random_uuid(),
  uid              text unique not null,
  nombre_documento text not null,
  url              text,
  orden            smallint,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table public.peebcoolsf_gestion_financiera (
  id         uuid primary key default gen_random_uuid(),
  uid        text unique not null,
  titulo     text,
  url        text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.peebcoolsf_capacitaciones_documentos (
  id         uuid primary key default gen_random_uuid(),
  uid        text unique not null,
  subseccion text not null check (subseccion in ('EE','AyS','G')),
  componente text references public.peebcoolsf_componentes(code),
  titulo     text not null,
  url        text,
  orden      smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.peebcoolsf_capacitaciones_eventos (
  id            uuid primary key default gen_random_uuid(),
  uid           text unique not null,
  subseccion    text not null check (subseccion in ('EE','AyS','G')),
  componente    text references public.peebcoolsf_componentes(code),
  entidades     text[] not null default '{}',          -- UIDs entidades
  participantes text[] not null default '{}',          -- UIDs equipo
  fecha_hora    timestamptz,
  documento_uid text references public.peebcoolsf_capacitaciones_documentos(uid),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.peebcoolsf_gestion_lineas (
  id              uuid primary key default gen_random_uuid(),
  uid             text unique not null,
  subproyecto_uid text not null references public.peebcoolsf_subproyectos(uid) on delete cascade,
  titulo          text not null,
  orden           smallint not null default 0,
  tipo_linea      text references public.peebcoolsf_tipo_linea(code),
  componente      text references public.peebcoolsf_componentes(code),
  url             text,                                  -- actif si tipo_linea='documento' (règle UI)
  estado          text references public.peebcoolsf_estados(code),
  fecha           date,
  fase            text references public.peebcoolsf_fases(code),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- is_admin() (après création de perfiles)
-- SECURITY DEFINER : lit perfiles en bypass RLS (anti-récursion). search_path vide.
-- ============================================================
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

-- ============================================================
-- Index (FK + colonnes filtrées)
-- ============================================================
create index idx_peebcoolsf_gestion_lineas_subproyecto on public.peebcoolsf_gestion_lineas(subproyecto_uid);
create index idx_peebcoolsf_gestion_lineas_componente  on public.peebcoolsf_gestion_lineas(componente);
create index idx_peebcoolsf_eventos_fecha              on public.peebcoolsf_eventos(fecha);
create index idx_peebcoolsf_eventos_componente         on public.peebcoolsf_eventos(componente);
create index idx_peebcoolsf_capevt_documento           on public.peebcoolsf_capacitaciones_eventos(documento_uid);
create index idx_peebcoolsf_equipo_entidad             on public.peebcoolsf_equipo(entidad_uid);
create index idx_peebcoolsf_equipo_componente          on public.peebcoolsf_equipo(componente);
-- subproyecto_uid + escenario : couverts par unique(subproyecto_uid, escenario) sur metricas.

-- ============================================================
-- Triggers updated_at
-- ============================================================
create trigger trg_sub_upd    before update on public.peebcoolsf_subproyectos              for each row execute function peebcoolsf_private.set_updated_at();
create trigger trg_met_upd    before update on public.peebcoolsf_metricas                  for each row execute function peebcoolsf_private.set_updated_at();
create trigger trg_eq_upd     before update on public.peebcoolsf_equipo                    for each row execute function peebcoolsf_private.set_updated_at();
create trigger trg_evt_upd    before update on public.peebcoolsf_eventos                   for each row execute function peebcoolsf_private.set_updated_at();
create trigger trg_docgp_upd  before update on public.peebcoolsf_documentacion_gp          for each row execute function peebcoolsf_private.set_updated_at();
create trigger trg_gf_upd     before update on public.peebcoolsf_gestion_financiera        for each row execute function peebcoolsf_private.set_updated_at();
create trigger trg_capdoc_upd before update on public.peebcoolsf_capacitaciones_documentos for each row execute function peebcoolsf_private.set_updated_at();
create trigger trg_capevt_upd before update on public.peebcoolsf_capacitaciones_eventos    for each row execute function peebcoolsf_private.set_updated_at();
create trigger trg_gl_upd     before update on public.peebcoolsf_gestion_lineas            for each row execute function peebcoolsf_private.set_updated_at();
