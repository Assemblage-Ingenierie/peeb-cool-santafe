-- ============================================================
-- Migration 016 — Planification des tâches (fechas + duración estimada).
-- Incrémentale. Idempotente. execute_sql (projet EXTERNAL).
--
-- Trois champs INDÉPENDANTS (durée « estimée » : ne calcule pas la fin) :
--   • peebcoolsf_roadmap_estado (par tâche = feuille × tarea_key) :
--       fecha_inicio (date) · fecha_fin (date) · dur_valor (int) · dur_unidad (text: dia|semana|mes)
--       → les cartes Hojas de ruta n'affichent que inicio + duración ; fecha_fin
--         se saisit dans Admin / Fases.
--   • peebcoolsf_gestion_lineas (lignes de fase, tipo_linea='etapa') :
--       dur_valor · dur_unidad (fecha_inicio/fecha_fin déjà présentes).
-- RLS déjà en place. Aucune nouvelle table.
-- ============================================================

alter table public.peebcoolsf_roadmap_estado
  add column if not exists fecha_inicio date,
  add column if not exists fecha_fin    date,
  add column if not exists dur_valor    integer,
  add column if not exists dur_unidad   text;

alter table public.peebcoolsf_gestion_lineas
  add column if not exists dur_valor    integer,
  add column if not exists dur_unidad   text;
