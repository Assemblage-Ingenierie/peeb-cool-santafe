-- ============================================================
-- Migration 030 — Distinguer « acceso rechazado » de « pendiente »
--
-- Depuis la migration 029, is_approved = false couvre DEUX situations que
-- l'admin doit pouvoir séparer :
--   • compte jamais traité      → « Pendiente de validación »  (à traiter)
--   • demande explicitement refusée → « Acceso rechazado »     (déjà traitée)
-- Sans ce drapeau, les comptes refusés remontent indéfiniment dans la liste
-- des demandes à traiter.
--
-- `is_rejected` n'a AUCUN effet sur les droits : le rempart reste is_approved
-- (policy restrictive `req_aprobacion`, migration 029). C'est un marqueur de
-- classement pour l'écran /roles uniquement.
-- Appliquée via MCP execute_sql (par lots).
-- ============================================================

begin;

-- ---------------------------------------------------------------
-- 1. Drapeau de refus explicite
-- ---------------------------------------------------------------
alter table public.peebcoolsf_perfiles
  add column if not exists is_rejected boolean not null default false;

comment on column public.peebcoolsf_perfiles.is_rejected is
  'Refus explicite par un admin. Sert au classement dans /roles ; les droits dépendent de is_approved.';

-- ---------------------------------------------------------------
-- 2. Garde anti-escalade (migration 027) étendue à is_rejected :
--    un non-admin ne doit pas pouvoir effacer son propre refus.
-- ---------------------------------------------------------------
create or replace function peebcoolsf_private.guard_self_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() = old.id and not (select peebcoolsf_private.is_admin()) then
    new.status := old.status;
    new.is_approved := old.is_approved;
    new.is_rejected := old.is_rejected;
  end if;
  return new;
end;
$$;

commit;
