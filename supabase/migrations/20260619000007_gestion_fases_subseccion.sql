-- ============================================================
-- Migration 007 — Gestión del subproyecto en 2 sous-sections (Documentos / Fases) — CDC §4.5
-- Incrémentale sur le schéma déployé. Idempotente. execute_sql (projet EXTERNAL).
--   • fecha_inicio / fecha_fin : dates propres aux fases (etapas).
--   • Nouvelle fase « No objeción AFD » (orden 5) entre Redacción de pliegos et Licitación.
--   • Une ligne de fase (tipo_linea='etapa') par (sous-projet × fase), UID stable = code de fase.
-- Les lignes existantes (documents) ne sont pas touchées → sous-section Documentos.
-- ============================================================

-- 1. Dates de phase
alter table public.peebcoolsf_gestion_lineas add column if not exists fecha_inicio date;
alter table public.peebcoolsf_gestion_lineas add column if not exists fecha_fin date;

-- 2. Fase « No objeción AFD » + réordonnancement chronologique (8 fases)
insert into public.peebcoolsf_fases (code, nombre, orden) values ('no_objecion_afd', 'No objeción AFD', 5)
on conflict (code) do update set nombre = excluded.nombre, orden = excluded.orden;
update public.peebcoolsf_fases set orden = 6 where code = 'licitacion';
update public.peebcoolsf_fases set orden = 7 where code = 'obra';
update public.peebcoolsf_fases set orden = 8 where code = 'general';
-- estudios_preliminares=1, anteproyecto=2, proyecto_ejecutivo=3, redaccion_pliegos=4 inchangés

-- 3. Lignes de fase par sous-projet (UID = GEST-<code_sub>-<code_fase>, stable)
insert into public.peebcoolsf_gestion_lineas (uid, subproyecto_uid, titulo, orden, tipo_linea, fase)
select 'GEST-' || regexp_replace(s.uid, '^SUB-', '') || '-' || f.code,
       s.uid, f.nombre, f.orden, 'etapa', f.code
from public.peebcoolsf_subproyectos s
cross join public.peebcoolsf_fases f
on conflict (uid) do nothing;
