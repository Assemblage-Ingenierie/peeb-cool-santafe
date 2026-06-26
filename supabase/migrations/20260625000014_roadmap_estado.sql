-- ============================================================
-- Migration 014 — Hojas de ruta : persistance de l'état d'édition
-- Incrémentale. Idempotente. execute_sql (projet EXTERNAL).
--   • peebcoolsf_roadmap_estado : état par feuille (× tâche).
--       feuille   = 'global' OU uid de sous-projet (SUB-…)
--       tarea_key = clé de carte (libellé d'origine ROADMAP_AYS, ou
--                   '<fase>-<code>' pour les cartes dynamiques de plan ;
--                   clé spéciale '__ano_afd__' = case « No objeción AFD recibida »)
--       realizada (case) + comentario (texte libre admin) + overrides
--       nombre/descripcion/responsable (null = valeur par défaut).
--   • peebcoolsf_roadmap_enlace : dépendances (flèches) par feuille (desde→hacia).
--   • Pas de FK sur tarea_key (les tâches vivent dans lib/constants, pas en base) ;
--     pas de FK sur feuille ('global' n'est pas un sous-projet).
--   • RLS : lecture authenticated, écriture admin (motif des autres tables).
--     Lecture publique réelle = via /api/snapshot en service_role.
-- ============================================================

create table if not exists public.peebcoolsf_roadmap_estado (
  feuille     text not null,
  tarea_key   text not null,
  realizada   boolean not null default false,
  comentario  text,
  nombre      text,
  descripcion text,
  responsable text,
  primary key (feuille, tarea_key)
);

alter table public.peebcoolsf_roadmap_estado enable row level security;

drop policy if exists "roadmap_estado_sel" on public.peebcoolsf_roadmap_estado;
create policy "roadmap_estado_sel" on public.peebcoolsf_roadmap_estado for select to authenticated using (true);
drop policy if exists "roadmap_estado_admin" on public.peebcoolsf_roadmap_estado;
create policy "roadmap_estado_admin" on public.peebcoolsf_roadmap_estado for all to authenticated
  using ((select peebcoolsf_private.is_admin())) with check ((select peebcoolsf_private.is_admin()));

create table if not exists public.peebcoolsf_roadmap_enlace (
  feuille text not null,
  desde   text not null,
  hacia   text not null,
  primary key (feuille, desde, hacia)
);

alter table public.peebcoolsf_roadmap_enlace enable row level security;

drop policy if exists "roadmap_enlace_sel" on public.peebcoolsf_roadmap_enlace;
create policy "roadmap_enlace_sel" on public.peebcoolsf_roadmap_enlace for select to authenticated using (true);
drop policy if exists "roadmap_enlace_admin" on public.peebcoolsf_roadmap_enlace;
create policy "roadmap_enlace_admin" on public.peebcoolsf_roadmap_enlace for all to authenticated
  using ((select peebcoolsf_private.is_admin())) with check ((select peebcoolsf_private.is_admin()));
