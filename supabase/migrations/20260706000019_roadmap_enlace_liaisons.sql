-- ============================================================
-- Migration 019 — Hojas de ruta : liaisons planifiantes (dépendance / parallèle).
-- Incrémentale. Idempotente. execute_sql (projet EXTERNAL).
--
-- La table peebcoolsf_roadmap_enlace (flèches desde→hacia) porte désormais une
-- sémantique de PLANIFICATION : « hacia » démarre par rapport à un point de
-- « desde », avec un décalage signé.
--   • punto          : point d'accroche sur la source  (inicio | fin ; défaut fin)
--   • desfase_valor  : décalage signé (négatif = avant, positif = après ; défaut 0)
--   • desfase_unidad : unité du décalage (dia | semana | mes ; défaut dia)
-- Presets côté UI : « Paralela » = (inicio, 0) · « Dependencia » = (fin, 0).
-- Les colonnes NOT NULL DEFAULT recalent les flèches existantes en dépendance
-- (fin + 0), conforme à leur sens actuel.
--
-- Le moteur de planning (lib/schedule.ts) calcule les dates À L'AFFICHAGE ;
-- rien de dérivé n'est stocké (convention projet). RLS déjà en place (mig. 014).
-- Aucune nouvelle table.
-- ============================================================

alter table public.peebcoolsf_roadmap_enlace
  add column if not exists punto          text    not null default 'fin',
  add column if not exists desfase_valor  integer not null default 0,
  add column if not exists desfase_unidad text    not null default 'dia';

alter table public.peebcoolsf_roadmap_enlace
  drop constraint if exists peebcoolsf_roadmap_enlace_punto_chk;
alter table public.peebcoolsf_roadmap_enlace
  add constraint peebcoolsf_roadmap_enlace_punto_chk check (punto in ('inicio', 'fin'));

alter table public.peebcoolsf_roadmap_enlace
  drop constraint if exists peebcoolsf_roadmap_enlace_desfase_unidad_chk;
alter table public.peebcoolsf_roadmap_enlace
  add constraint peebcoolsf_roadmap_enlace_desfase_unidad_chk
  check (desfase_unidad in ('dia', 'semana', 'mes'));
