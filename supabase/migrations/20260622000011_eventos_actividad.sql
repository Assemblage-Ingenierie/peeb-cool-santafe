-- ============================================================
-- Migration 011 — Journal d'activité du Calendario — CDC §4.3 (ajout user)
-- Incrémentale sur le schéma déployé. Idempotente. execute_sql (projet EXTERNAL).
--   • Table peebcoolsf_eventos_actividad : trace les créations et suppressions
--     d'événements faites en self-service depuis la page Calendario (les non-admins
--     peuvent désormais gérer les réunions). Alimente l'alerte « +N » de l'Inicio
--     (prévenir l'admin, y compris des suppressions — le nom/fecha sont copiés ici
--     car la ligne eventos disparaît à la suppression).
--   • RLS : lecture authenticated, écriture admin (motif des autres tables).
--     N.B. l'app lit/écrit via service_role (snapshot + Server Actions) ; ces
--     policies préparent l'Étape 6.
-- ============================================================

create table if not exists public.peebcoolsf_eventos_actividad (
  id            uuid primary key default gen_random_uuid(),
  tipo          text not null check (tipo in ('creado', 'eliminado')),
  evento_uid    text not null,
  evento_nombre text not null default '',
  evento_fecha  date,
  creado_en     timestamptz not null default now()
);

alter table public.peebcoolsf_eventos_actividad enable row level security;

create index if not exists idx_peebcoolsf_eventos_actividad_creado
  on public.peebcoolsf_eventos_actividad (creado_en desc);

drop policy if exists "eventos_actividad_sel" on public.peebcoolsf_eventos_actividad;
create policy "eventos_actividad_sel" on public.peebcoolsf_eventos_actividad for select to authenticated using (true);
drop policy if exists "eventos_actividad_admin" on public.peebcoolsf_eventos_actividad;
create policy "eventos_actividad_admin" on public.peebcoolsf_eventos_actividad for all to authenticated
  using ((select peebcoolsf_private.is_admin())) with check ((select peebcoolsf_private.is_admin()));
