-- ============================================================
-- Migration 015 — Hojas de ruta : cartes créées + overrides de
-- position / visibilité (gestionnaire de cartes admin).
-- Incrémentale. Idempotente. execute_sql (projet EXTERNAL).
--
-- Design « table unique » : on étend peebcoolsf_roadmap_estado.
--   • oculta     : carte par défaut masquée sur cette feuille (« suppression »).
--   • fila       : override de phase (sous-projet) / semestre (global).
--                  NULL = fila d'origine (code) ; pour les cartes créées =
--                  le code de phase/semestre où la carte a été posée.
--   • orden      : clé de tri dans la colonne (composante × fila). NULL = ordre
--                  par défaut (index du code). double precision (drag-drop).
--   • componente : composante d'une carte CRÉÉE (GP|EE|AyS|G). NULL pour défaut.
--   • creada     : true = carte ajoutée à la main (tarea_key = UID généré) ;
--                  sa suppression = DELETE de la ligne (pas de masquage).
-- RLS déjà en place (migration 014). Aucune nouvelle table.
-- ============================================================

alter table public.peebcoolsf_roadmap_estado
  add column if not exists oculta     boolean not null default false,
  add column if not exists fila       text,
  add column if not exists orden      double precision,
  add column if not exists componente text,
  add column if not exists creada     boolean not null default false;
