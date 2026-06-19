-- ============================================================
-- Migration 005 — 2 nouvelles fases + réordonnancement chronologique — CDC §3.2
-- Incrémentale sur le schéma déployé. Idempotente. execute_sql (projet EXTERNAL).
-- Ajoute « Anteproyecto » (avant Proyecto ejecutivo) et « Redacción de pliegos »
-- (avant Licitación) dans le référentiel peebcoolsf_fases.
-- Indispensable : gestion_lineas.fase est une FK vers peebcoolsf_fases(code).
-- Ordre cible (orden) :
--   1 estudios_preliminares · 2 anteproyecto · 3 proyecto_ejecutivo
--   4 redaccion_pliegos · 5 licitacion · 6 obra · 7 general
-- ============================================================

insert into public.peebcoolsf_fases (code, nombre, orden) values
  ('anteproyecto',      'Anteproyecto',          2),
  ('redaccion_pliegos', 'Redacción de pliegos',  4)
on conflict (code) do update set nombre = excluded.nombre, orden = excluded.orden;

update public.peebcoolsf_fases set orden = 3 where code = 'proyecto_ejecutivo';
update public.peebcoolsf_fases set orden = 5 where code = 'licitacion';
update public.peebcoolsf_fases set orden = 6 where code = 'obra';
update public.peebcoolsf_fases set orden = 7 where code = 'general';
-- estudios_preliminares reste orden = 1
