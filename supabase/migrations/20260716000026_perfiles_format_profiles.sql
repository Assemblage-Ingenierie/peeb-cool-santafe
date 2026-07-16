-- ============================================================
-- Migration 026 — peebcoolsf_perfiles aligné sur le format de la table `profiles`
-- (table de l'autre app peeb_ du projet partagé). Mêmes colonnes que profiles,
-- MAIS status conserve les rôles métier peeb (admin/gestion/consultor).
-- Appliquée via MCP execute_sql (une transaction). Reflet du déploiement réel.
--
-- Changements clés :
--  • PK id = uid auth (comme profiles.id, FK auth.users on delete cascade) ;
--    l'ancien id aléatoire est supprimé et user_id devient id.
--  • rol -> status (mêmes valeurs), défaut 'consultor'.
--  • Colonnes ajoutées : email, first_name, last_name, job_title,
--    is_approved (défaut true), requested_status.
--  • is_admin()/current_rol() réécrites pour lire id/status.
--  • Policies perfiles_sel/perfiles_admin recréées sur id.
-- NB : les triggers/notifications propres à l'app `profiles` (peeb_*) ne sont
--      PAS répliqués ici (comportement spécifique à l'autre app).
-- ============================================================

begin;

drop policy if exists "perfiles_sel"   on public.peebcoolsf_perfiles;
drop policy if exists "perfiles_admin" on public.peebcoolsf_perfiles;

alter table public.peebcoolsf_perfiles drop constraint peebcoolsf_perfiles_pkey;
alter table public.peebcoolsf_perfiles drop constraint peebcoolsf_perfiles_user_id_key;
alter table public.peebcoolsf_perfiles drop column id;
alter table public.peebcoolsf_perfiles rename column user_id to id;
alter table public.peebcoolsf_perfiles add constraint peebcoolsf_perfiles_pkey primary key (id);
alter table public.peebcoolsf_perfiles
  rename constraint peebcoolsf_perfiles_user_id_fkey to peebcoolsf_perfiles_id_fkey;

alter table public.peebcoolsf_perfiles drop constraint peebcoolsf_perfiles_rol_check;
alter table public.peebcoolsf_perfiles rename column rol to status;
alter table public.peebcoolsf_perfiles alter column status set default 'consultor';
alter table public.peebcoolsf_perfiles add constraint peebcoolsf_perfiles_status_check
  check (status = any (array['admin','gestion','consultor']));

alter table public.peebcoolsf_perfiles add column email        text;
alter table public.peebcoolsf_perfiles add column first_name   text;
alter table public.peebcoolsf_perfiles add column last_name    text;
alter table public.peebcoolsf_perfiles add column job_title    text;
alter table public.peebcoolsf_perfiles add column is_approved  boolean not null default true;
alter table public.peebcoolsf_perfiles add column requested_status text;
alter table public.peebcoolsf_perfiles add constraint peebcoolsf_perfiles_requested_status_check
  check (requested_status is null or requested_status = any (array['gestion','admin']));

update public.peebcoolsf_perfiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is null;

create or replace function peebcoolsf_private.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.peebcoolsf_perfiles where id = auth.uid() and status = 'admin');
$$;

create or replace function peebcoolsf_private.current_rol()
returns text language sql stable security definer set search_path = '' as $$
  select status from public.peebcoolsf_perfiles where id = auth.uid();
$$;

create policy "perfiles_sel" on public.peebcoolsf_perfiles for select to authenticated
  using ((select auth.uid()) = id or (select peebcoolsf_private.is_admin()));
create policy "perfiles_admin" on public.peebcoolsf_perfiles for all to authenticated
  using ((select peebcoolsf_private.is_admin())) with check ((select peebcoolsf_private.is_admin()));

commit;
