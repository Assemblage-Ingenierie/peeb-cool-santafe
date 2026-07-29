-- ============================================================
-- Migration 029 — Validation d'accès obligatoire
--
-- Toute nouvelle inscription arrive désormais avec is_approved = false
-- (« pendiente de validación »). Tant qu'un administrateur n'a pas approuvé
-- la demande, l'utilisateur ne voit qu'un écran d'attente (côté app) et
-- n'a AUCUN accès aux données métier (côté RLS, rempart réel).
--
-- Mise en œuvre RLS : une policy RESTRICTIVE `req_aprobacion` est ajoutée sur
-- toutes les tables `peebcoolsf_*` SAUF `peebcoolsf_perfiles` (l'utilisateur
-- doit pouvoir lire sa propre ligne pour connaître son état). Une policy
-- restrictive se combine en AND avec les policies permissives existantes :
-- les policies *_sel / *_admin restent inchangées, elles sont juste
-- conditionnées à l'approbation.
--
-- Les comptes existants (is_approved = true) ne sont pas impactés.
-- Appliquée via MCP execute_sql (par lots).
-- ============================================================

begin;

-- ---------------------------------------------------------------
-- 1. Défaut : nouvelle ligne = en attente de validation
-- ---------------------------------------------------------------
alter table public.peebcoolsf_perfiles alter column is_approved set default false;

-- ---------------------------------------------------------------
-- 2. Provisioning auto (remplace la version de la migration 028) :
--    is_approved = false → l'admin doit valider.
-- ---------------------------------------------------------------
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
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------
-- 3. Helper : l'utilisateur courant est-il approuvé ?
--    Même modèle sécurisé que is_admin() / current_rol()
--    (SECURITY DEFINER + search_path = '').
-- ---------------------------------------------------------------
create or replace function peebcoolsf_private.is_approved()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select p.is_approved from public.peebcoolsf_perfiles p where p.id = (select auth.uid())),
    false
  );
$$;

-- ---------------------------------------------------------------
-- 4. Policy RESTRICTIVE sur toutes les tables métier.
--    Boucle : couvre les tables actuelles ; toute table future devra
--    recevoir la même policy (à ajouter dans sa propre migration).
-- ---------------------------------------------------------------
do $$
declare t record;
begin
  for t in
    select tablename
    from pg_tables
    where schemaname = 'public'
      and tablename like 'peebcoolsf\_%'
      and tablename <> 'peebcoolsf_perfiles'
  loop
    execute format('drop policy if exists "req_aprobacion" on public.%I', t.tablename);
    execute format(
      'create policy "req_aprobacion" on public.%I as restrictive for all to authenticated '
      || 'using ((select peebcoolsf_private.is_approved())) '
      || 'with check ((select peebcoolsf_private.is_approved()))',
      t.tablename
    );
  end loop;
end $$;

-- ---------------------------------------------------------------
-- 5. Protection du dernier admin — étendue à is_approved (migration 027 ne
--    couvrait que status : révoquer l'accès du dernier admin verrouillait l'app).
-- ---------------------------------------------------------------
create or replace function peebcoolsf_private.protect_last_admin()
returns trigger language plpgsql security definer set search_path = '' as $$
declare n_admins int;
begin
  if tg_op = 'DELETE' then
    if old.status = 'admin' then
      select count(*) into n_admins from public.peebcoolsf_perfiles
        where status = 'admin' and is_approved;
      if n_admins <= 1 then raise exception 'No se puede eliminar el último administrador'; end if;
    end if;
    return old;
  else
    -- Perte du rôle admin OU perte de l'accès validé = perte d'un admin actif.
    if old.status = 'admin' and old.is_approved
       and (new.status is distinct from 'admin' or not new.is_approved) then
      select count(*) into n_admins from public.peebcoolsf_perfiles
        where status = 'admin' and is_approved;
      if n_admins <= 1 then raise exception 'No se puede quitar el último administrador'; end if;
    end if;
    return new;
  end if;
end;
$$;

commit;
