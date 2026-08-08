-- ============================================================
-- Migration 032 — Noms des 5 écoles préexistantes harmonisés
--
-- Les 18 écoles du périmètre (migration 031) portent le format officiel de la
-- liste provinciale : « <TIPO> N°<número> "<nombre>" » (ex. EPCD N°749 "Gregoria
-- Matorras de San Martín"). Les 5 écoles de Rosario / Santa Fe Capital, plus
-- anciennes dans l'app, gardaient un libellé abrégé (« Escuela 67 Pestalozzi »).
--
-- On aligne les 5 sur le même format pour que la liste soit homogène — c'est le
-- nom AFFICHÉ partout (tableau Inicio, carte, sélecteurs, export Excel).
-- Le sigle de type porte une information réelle : EPCD (primaria común diurna),
-- EESO (secundaria orientada), EETP (técnico-profesional).
--
-- SUB-E331 regroupe DEUX établissements sur le même site (EESO N°331 et
-- EPCD N°1250) : le libellé les mentionne tous les deux.
--
-- Aucun UID ne change → aucune donnée liée (roadmap, planning, métricas) touchée.
-- ============================================================

update public.peebcoolsf_subproyectos as s
set nombre = v.nombre
from (values
  ('SUB-E67',   'EPCD N°67 "Juan Enrique Pestalozzi"'),
  ('SUB-E407',  'EETP y SO N°407 "Pocho Lepratti"'),
  ('SUB-E574',  'EESO N°574 "Juan Carlos Gauseño"'),
  ('SUB-E1109', 'EPCD N°1109 "Hipólito Yrigoyen"'),
  ('SUB-E331',  'EESO N°331 y EPCD N°1250 "Almirante Guillermo Brown"')
) as v(uid, nombre)
where s.uid = v.uid;
