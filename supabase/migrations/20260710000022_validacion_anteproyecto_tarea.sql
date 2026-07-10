-- ============================================================
-- 022 — « Validación de anteproyecto » : de jalon (etapa) à tarea GP.
-- Elle devient une tarea GP de la fase Anteproyecto (ROADMAP_TAREAS,
-- id 'validacion_anteproyecto') au lieu d'un jalon/ligne de fase « etapa ».
-- Conséquences DB (tous les sous-projets) :
--   1. Migrer dates/durée de l'ancienne ligne « etapa » → plan de la carte
--      (roadmap_estado, tarea_key='validacion_anteproyecto').
--   2. Migrer l'état « realizada » de l'ancienne case jalon (__val_anteproyecto__)
--      → carte, puis supprimer ces lignes.
--   3. Supprimer les lignes « etapa » validacion_anteproyecto.
--   4. Renuméroter les fases restantes (fermer le rang 3) — gestion + référentiel.
--   5. Supprimer le code de fase du référentiel.
-- Idempotent. Exécuté via MCP execute_sql (dev). execute_sql non atomique →
-- lots indépendants, ré-exécutables.
-- ============================================================

-- 1) Dates/durée de l'étape → plan de la carte GP.
insert into public.peebcoolsf_roadmap_estado
  (feuille, tarea_key, fecha_inicio, fecha_fin, dur_valor, dur_unidad)
select subproyecto_uid, 'validacion_anteproyecto', fecha_inicio, fecha_fin, dur_valor, dur_unidad
from public.peebcoolsf_gestion_lineas
where tipo_linea = 'etapa' and fase = 'validacion_anteproyecto'
  and (fecha_inicio is not null or fecha_fin is not null or dur_valor is not null or dur_unidad is not null)
on conflict (feuille, tarea_key) do update
  set fecha_inicio = excluded.fecha_inicio,
      fecha_fin    = excluded.fecha_fin,
      dur_valor    = excluded.dur_valor,
      dur_unidad   = excluded.dur_unidad;

-- 2) « realizada » de la case jalon → carte, puis suppression des lignes jalon.
insert into public.peebcoolsf_roadmap_estado (feuille, tarea_key, realizada)
select feuille, 'validacion_anteproyecto', realizada
from public.peebcoolsf_roadmap_estado
where tarea_key = '__val_anteproyecto__'
on conflict (feuille, tarea_key) do update set realizada = excluded.realizada;

delete from public.peebcoolsf_roadmap_estado where tarea_key = '__val_anteproyecto__';

-- 3) Supprimer les lignes de fase « etapa » validacion_anteproyecto.
delete from public.peebcoolsf_gestion_lineas
where tipo_linea = 'etapa' and fase = 'validacion_anteproyecto';

-- 4) Renuméroter les fases restantes (nouvel ordre canonique GESTION_FASES).
update public.peebcoolsf_gestion_lineas set orden = 3  where tipo_linea = 'etapa' and fase = 'proyecto_ejecutivo';
update public.peebcoolsf_gestion_lineas set orden = 4  where tipo_linea = 'etapa' and fase = 'redaccion_pliegos';
update public.peebcoolsf_gestion_lineas set orden = 5  where tipo_linea = 'etapa' and fase = 'no_objecion_afd';
update public.peebcoolsf_gestion_lineas set orden = 6  where tipo_linea = 'etapa' and fase = 'licitacion';
update public.peebcoolsf_gestion_lineas set orden = 7  where tipo_linea = 'etapa' and fase = 'no_objecion_afd_atribucion';
update public.peebcoolsf_gestion_lineas set orden = 8  where tipo_linea = 'etapa' and fase = 'no_objecion_afd_contrato';
update public.peebcoolsf_gestion_lineas set orden = 9  where tipo_linea = 'etapa' and fase = 'obra';
update public.peebcoolsf_gestion_lineas set orden = 10 where tipo_linea = 'etapa' and fase = 'general';

update public.peebcoolsf_fases set orden = 3  where code = 'proyecto_ejecutivo';
update public.peebcoolsf_fases set orden = 4  where code = 'redaccion_pliegos';
update public.peebcoolsf_fases set orden = 5  where code = 'no_objecion_afd';
update public.peebcoolsf_fases set orden = 6  where code = 'licitacion';
update public.peebcoolsf_fases set orden = 7  where code = 'no_objecion_afd_atribucion';
update public.peebcoolsf_fases set orden = 8  where code = 'no_objecion_afd_contrato';
update public.peebcoolsf_fases set orden = 9  where code = 'obra';
update public.peebcoolsf_fases set orden = 10 where code = 'general';

-- 5) Supprimer le code de fase du référentiel (plus aucune ligne ne le référence).
delete from public.peebcoolsf_fases where code = 'validacion_anteproyecto';
