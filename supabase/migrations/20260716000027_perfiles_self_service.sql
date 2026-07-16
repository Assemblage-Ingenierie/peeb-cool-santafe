-- ============================================================
-- Migration 027 — Self-service profil + workflow de demande de rôle
-- (comme peeb-jordan). Un utilisateur peut éditer SA ligne
-- (nombre/apellido/cargo/requested_status) ; garde anti-escalade sur
-- status/is_approved ; protection du dernier admin.
-- Appliquée via MCP execute_sql (transaction).
-- ============================================================

begin;

-- Self-service : mise à jour de sa propre ligne (en plus des admins via perfiles_admin).
drop policy if exists "perfiles_self_update" on public.peebcoolsf_perfiles;
create policy "perfiles_self_update" on public.peebcoolsf_perfiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Garde anti-escalade : un non-admin ne peut pas changer son propre status / is_approved.
create or replace function peebcoolsf_private.guard_self_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() = old.id and not (select peebcoolsf_private.is_admin()) then
    new.status := old.status;
    new.is_approved := old.is_approved;
  end if;
  return new;
end;
$$;
drop trigger if exists peebcoolsf_perfiles_guard_self_update on public.peebcoolsf_perfiles;
create trigger peebcoolsf_perfiles_guard_self_update
  before update on public.peebcoolsf_perfiles
  for each row execute function peebcoolsf_private.guard_self_update();

-- Protection du dernier admin (update/delete).
create or replace function peebcoolsf_private.protect_last_admin()
returns trigger language plpgsql security definer set search_path = '' as $$
declare n_admins int;
begin
  if tg_op = 'DELETE' then
    if old.status = 'admin' then
      select count(*) into n_admins from public.peebcoolsf_perfiles where status = 'admin';
      if n_admins <= 1 then raise exception 'No se puede eliminar el último administrador'; end if;
    end if;
    return old;
  else
    if old.status = 'admin' and new.status is distinct from 'admin' then
      select count(*) into n_admins from public.peebcoolsf_perfiles where status = 'admin';
      if n_admins <= 1 then raise exception 'No se puede quitar el último administrador'; end if;
    end if;
    return new;
  end if;
end;
$$;
drop trigger if exists peebcoolsf_perfiles_protect_last_admin on public.peebcoolsf_perfiles;
create trigger peebcoolsf_perfiles_protect_last_admin
  before update or delete on public.peebcoolsf_perfiles
  for each row execute function peebcoolsf_private.protect_last_admin();

commit;
