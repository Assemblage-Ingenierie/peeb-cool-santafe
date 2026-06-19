-- ============================================================
-- Migration 003 — 3 rôles + confidentialité par ligne (CDC §10)
-- Incrémentale sur le schéma déjà déployé (Étape 1). Idempotente.
-- Appliquée via le connecteur MCP (execute_sql), projet EXTERNAL.
-- Ne recrée AUCUNE table, ne re-seed PAS.
-- ============================================================

-- ------------------------------------------------------------
-- LOT 1 — Rôles : {admin, usuario} → {admin, gestion, consultor}
-- (peebcoolsf_perfiles est vide : aucune donnée à migrer)
-- ------------------------------------------------------------
alter table public.peebcoolsf_perfiles drop constraint if exists peebcoolsf_perfiles_rol_check;
alter table public.peebcoolsf_perfiles add constraint peebcoolsf_perfiles_rol_check
  check (rol in ('admin','gestion','consultor'));

-- Rôle courant exposé aux policies (même modèle sécurisé que is_admin())
create or replace function peebcoolsf_private.current_rol()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select rol from public.peebcoolsf_perfiles where user_id = auth.uid();
$$;
-- is_admin() reste inchangée (le rôle 'admin' existe toujours).

-- ------------------------------------------------------------
-- LOT 2 — Champ confidencial (tables documentaires, CDC §4.4)
-- ------------------------------------------------------------
alter table public.peebcoolsf_documentacion_gp          add column if not exists confidencial boolean not null default false;
alter table public.peebcoolsf_gestion_financiera        add column if not exists confidencial boolean not null default false;
alter table public.peebcoolsf_capacitaciones_documentos add column if not exists confidencial boolean not null default false;
alter table public.peebcoolsf_capacitaciones_eventos    add column if not exists confidencial boolean not null default false;
alter table public.peebcoolsf_gestion_lineas            add column if not exists confidencial boolean not null default false;

-- ------------------------------------------------------------
-- LOT 3 — Policies de lecture confidentialité-aware
-- admin/gestion → toutes les lignes ; consultor (ou sans profil) → confidencial = false
-- (les policies d'écriture *_admin FOR ALL using is_admin() restent inchangées → écriture admin only)
-- ------------------------------------------------------------
drop policy if exists "documentacion_gp_sel" on public.peebcoolsf_documentacion_gp;
create policy "documentacion_gp_sel" on public.peebcoolsf_documentacion_gp for select to authenticated
  using ((select peebcoolsf_private.current_rol()) in ('admin','gestion') or confidencial = false);

drop policy if exists "gestion_financiera_sel" on public.peebcoolsf_gestion_financiera;
create policy "gestion_financiera_sel" on public.peebcoolsf_gestion_financiera for select to authenticated
  using ((select peebcoolsf_private.current_rol()) in ('admin','gestion') or confidencial = false);

drop policy if exists "capdoc_sel" on public.peebcoolsf_capacitaciones_documentos;
create policy "capdoc_sel" on public.peebcoolsf_capacitaciones_documentos for select to authenticated
  using ((select peebcoolsf_private.current_rol()) in ('admin','gestion') or confidencial = false);

drop policy if exists "capevt_sel" on public.peebcoolsf_capacitaciones_eventos;
create policy "capevt_sel" on public.peebcoolsf_capacitaciones_eventos for select to authenticated
  using ((select peebcoolsf_private.current_rol()) in ('admin','gestion') or confidencial = false);

drop policy if exists "gestion_lineas_sel" on public.peebcoolsf_gestion_lineas;
create policy "gestion_lineas_sel" on public.peebcoolsf_gestion_lineas for select to authenticated
  using ((select peebcoolsf_private.current_rol()) in ('admin','gestion') or confidencial = false);
