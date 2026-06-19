-- ============================================================
-- Migration 002 — Row Level Security (RLS) + policies
-- Lecture = authenticated ; écriture = admin (via peebcoolsf_private.is_admin()).
-- Reflet du déploiement réel (projet EXTERNAL, tables peebcoolsf_).
-- ============================================================

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

-- === perfiles : lecture (propre ligne OU admin) / écriture admin ===
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
