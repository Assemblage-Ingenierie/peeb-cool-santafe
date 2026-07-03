-- ============================================================
-- Migration 018 — Notas : titre + corps enrichi (gras).
-- Incrémentale. Idempotente. execute_sql (projet EXTERNAL).
--   • titulo : titre de la nota (texte).
--   • contenido stocke désormais du HTML simple (gras) au lieu de texte brut.
-- ============================================================

alter table public.peebcoolsf_notas add column if not exists titulo text not null default '';
