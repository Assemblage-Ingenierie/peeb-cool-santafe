-- ============================================================
-- Migration 004 — champ publicar (workflow d'affichage) — CDC §4.4 / §10
-- Incrémentale sur le schéma déployé. Idempotente. execute_sql (projet EXTERNAL).
-- IMPORTANT : publicar ≠ confidencial.
--   • confidencial = accès (RLS ; Consultor exclu)        → migration 003
--   • publicar     = affichage sur les pages publiques     → CETTE migration
-- AUCUNE policy RLS ici (publicar n'est pas de la sécurité).
-- Le filtrage publicar = true se fera à l'affichage public (Étape 4), pas en RLS.
-- ============================================================

alter table public.peebcoolsf_documentacion_gp          add column if not exists publicar boolean not null default false;
alter table public.peebcoolsf_gestion_financiera        add column if not exists publicar boolean not null default false;
alter table public.peebcoolsf_capacitaciones_documentos add column if not exists publicar boolean not null default false;
alter table public.peebcoolsf_capacitaciones_eventos    add column if not exists publicar boolean not null default false;
alter table public.peebcoolsf_gestion_lineas            add column if not exists publicar boolean not null default false;
