-- ============================================================
-- Migration 009 — Formaciones dans Calendario ; retrait de capacitaciones_eventos
-- Incrémentale sur le schéma déployé. Idempotente. execute_sql (projet EXTERNAL).
--   • eventos.formacion (bool) : marque un événement du Calendario comme formation.
--   • eventos.url_documento (text) : lien vers un document associé à l'événement.
--   • Suppression de la table peebcoolsf_capacitaciones_eventos : la sous-section
--     « eventos » de Capacitaciones est retirée ; les formations se créent désormais
--     comme événements du Calendario (case « Formación »). Données = 3 lignes seed
--     vides (0 réelle) → suppression sûre. La sous-section « Documentos » des
--     capacitaciones (capacitaciones_documentos) est conservée.
-- ============================================================

alter table public.peebcoolsf_eventos
  add column if not exists formacion boolean not null default false;

alter table public.peebcoolsf_eventos
  add column if not exists url_documento text;

drop table if exists public.peebcoolsf_capacitaciones_eventos;
