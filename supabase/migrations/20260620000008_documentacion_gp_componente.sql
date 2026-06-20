-- ============================================================
-- Migration 008 — Composante sur « Documentación de proyecto » — CDC §4.1 (Proyecto global)
-- Incrémentale sur le schéma déployé. Idempotente. execute_sql (projet EXTERNAL).
--   • Ajoute documentacion_gp.componente (FK vers peebcoolsf_componentes) afin de
--     regrouper les documents de projet par composante (GP/EE/AyS/G) dans le bloc
--     « Documentos » du mode Proyecto global.
-- Nullable : les documents existants restent sans composante jusqu'à classement (Admin).
-- Calqué sur le motif componente des autres tables (gestion_lineas, eventos, …).
-- ============================================================

alter table public.peebcoolsf_documentacion_gp
  add column if not exists componente text
  references public.peebcoolsf_componentes(code);
