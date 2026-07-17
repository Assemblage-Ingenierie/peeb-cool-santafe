-- ============================================================
-- Migration 028 — Provisioning auto des profils (comme peeb-jordan)
-- Crée une ligne peebcoolsf_perfiles à la création/1re connexion d'un utilisateur
-- auth (rôle 'consultor', is_approved=true). Triggers au nom DISTINCT pour
-- cohabiter avec ceux de l'autre app (peeb_/profiles) sur auth.users partagé.
-- Appliquée via MCP execute_sql (transaction).
-- ============================================================

begin;

create or replace function peebcoolsf_private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.peebcoolsf_perfiles (id, email, first_name, last_name, job_title, status, is_approved)
  values (
    new.id,
    coalesce(new.email, new.raw_user_meta_data->>'email'),
    coalesce(new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'given_name'),
    coalesce(new.raw_user_meta_data->>'last_name',  new.raw_user_meta_data->>'family_name'),
    new.raw_user_meta_data->>'job_title',
    'consultor',
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- INSERT (inscription email/mot de passe)
drop trigger if exists peebcoolsf_on_auth_user_created on auth.users;
create trigger peebcoolsf_on_auth_user_created
  after insert on auth.users
  for each row execute function peebcoolsf_private.handle_new_user();

-- UPDATE (1re connexion Google arrive parfois en UPDATE, pas INSERT)
drop trigger if exists peebcoolsf_on_auth_user_updated on auth.users;
create trigger peebcoolsf_on_auth_user_updated
  after update of email_confirmed_at, last_sign_in_at on auth.users
  for each row
  when (old.last_sign_in_at is distinct from new.last_sign_in_at)
  execute function peebcoolsf_private.handle_new_user();

-- Backfill : tout auth.users sans ligne peebcoolsf_perfiles
insert into public.peebcoolsf_perfiles (id, email, first_name, last_name, job_title, status, is_approved)
select u.id,
       coalesce(u.email, u.raw_user_meta_data->>'email'),
       coalesce(u.raw_user_meta_data->>'first_name', u.raw_user_meta_data->>'given_name'),
       coalesce(u.raw_user_meta_data->>'last_name',  u.raw_user_meta_data->>'family_name'),
       u.raw_user_meta_data->>'job_title',
       'consultor',
       true
from auth.users u
left join public.peebcoolsf_perfiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

commit;
