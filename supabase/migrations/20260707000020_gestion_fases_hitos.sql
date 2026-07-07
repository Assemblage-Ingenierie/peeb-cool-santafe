-- ============================================================
-- 020 — Jalons (« checks ») comme lignes « etapa » de Gestión de subproyectos.
-- Ajoute Validación de anteproyecto, No objeción AFD — Atribución et — Contrato
-- comme lignes de fase (pour porter dates / durées), au bon rang chronologique.
-- Renumérote les fases existantes pour intercaler les jalons :
--   1 estudios_preliminares · 2 anteproyecto · 3 VALIDACIÓN DE ANTEPROYECTO ·
--   4 proyecto_ejecutivo · 5 redaccion_pliegos · 6 no_objecion_afd · 7 licitacion ·
--   8 NO OBJECIÓN AFD — ATRIBUCIÓN · 9 NO OBJECIÓN AFD — CONTRATO · 10 obra · 11 general
-- Idempotent (inserts on conflict do nothing) ; exécuté via MCP execute_sql (dev).
-- ============================================================

-- 0) Référentiel peebcoolsf_fases (FK de gestion_lineas.fase) : renuméroter +
--    ajouter les codes des jalons.
update public.peebcoolsf_fases set orden = 4  where code = 'proyecto_ejecutivo';
update public.peebcoolsf_fases set orden = 5  where code = 'redaccion_pliegos';
update public.peebcoolsf_fases set orden = 6  where code = 'no_objecion_afd';
update public.peebcoolsf_fases set orden = 7  where code = 'licitacion';
update public.peebcoolsf_fases set orden = 10 where code = 'obra';
update public.peebcoolsf_fases set orden = 11 where code = 'general';
insert into public.peebcoolsf_fases (code, nombre, orden) values
  ('validacion_anteproyecto', 'Validación de anteproyecto', 3),
  ('no_objecion_afd_atribucion', 'No objeción AFD — Atribución', 8),
  ('no_objecion_afd_contrato', 'No objeción AFD — Contrato', 9)
on conflict (code) do nothing;

-- 1) Renuméroter les fases existantes pour libérer les rangs 3, 8, 9.
update public.peebcoolsf_gestion_lineas set orden = 4  where tipo_linea = 'etapa' and fase = 'proyecto_ejecutivo';
update public.peebcoolsf_gestion_lineas set orden = 5  where tipo_linea = 'etapa' and fase = 'redaccion_pliegos';
update public.peebcoolsf_gestion_lineas set orden = 6  where tipo_linea = 'etapa' and fase = 'no_objecion_afd';
update public.peebcoolsf_gestion_lineas set orden = 7  where tipo_linea = 'etapa' and fase = 'licitacion';
update public.peebcoolsf_gestion_lineas set orden = 10 where tipo_linea = 'etapa' and fase = 'obra';
update public.peebcoolsf_gestion_lineas set orden = 11 where tipo_linea = 'etapa' and fase = 'general';

-- 2) Insérer les jalons pour chaque sous-projet (UID / confidencial / publicar
--    copiés du gabarit = la ligne de la phase précédente du même sous-projet).
insert into public.peebcoolsf_gestion_lineas
  (uid, subproyecto_uid, titulo, tipo_linea, fase, orden, confidencial, publicar)
select 'GEST-' || substring(subproyecto_uid from 5) || '-validacion_anteproyecto',
       subproyecto_uid, 'Validación de anteproyecto', 'etapa', 'validacion_anteproyecto', 3,
       confidencial, publicar
from public.peebcoolsf_gestion_lineas
where tipo_linea = 'etapa' and fase = 'anteproyecto'
on conflict (uid) do nothing;

insert into public.peebcoolsf_gestion_lineas
  (uid, subproyecto_uid, titulo, tipo_linea, fase, orden, confidencial, publicar)
select 'GEST-' || substring(subproyecto_uid from 5) || '-no_objecion_afd_atribucion',
       subproyecto_uid, 'No objeción AFD — Atribución', 'etapa', 'no_objecion_afd_atribucion', 8,
       confidencial, publicar
from public.peebcoolsf_gestion_lineas
where tipo_linea = 'etapa' and fase = 'licitacion'
on conflict (uid) do nothing;

insert into public.peebcoolsf_gestion_lineas
  (uid, subproyecto_uid, titulo, tipo_linea, fase, orden, confidencial, publicar)
select 'GEST-' || substring(subproyecto_uid from 5) || '-no_objecion_afd_contrato',
       subproyecto_uid, 'No objeción AFD — Contrato', 'etapa', 'no_objecion_afd_contrato', 9,
       confidencial, publicar
from public.peebcoolsf_gestion_lineas
where tipo_linea = 'etapa' and fase = 'licitacion'
on conflict (uid) do nothing;
