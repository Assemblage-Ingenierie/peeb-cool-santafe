-- ============================================================
-- 036 — Cronograma de subproyecto : la fase devient l'ENVELOPPE de ses tâches.
--
-- Modèle validé en maquette. La barre d'une phase n'est plus saisie : elle
-- commence avec sa première ligne et finit avec la dernière. Pour que les
-- tâches aient un point d'accroche qui ne soit pas leur propre phase (ce qui
-- serait circulaire), chaque phase reçoit deux REPÈRES d'un jour :
--   __ini__<fase>  début de phase  — les tâches qui « démarrent avec la phase »
--   __ent__<fase>  remise du livrable — les tâches qui « finissent avec la
--                  phase » y accrochent leur FIN (la validation vient après).
-- Les « No objeción AFD » cessent d'être des phases vides : ce sont des jalons
-- __cno__<code>, hors phase, qui pendent de la fin d'une autre ligne.
--
-- ⚠ PÉRIMÈTRE : SUB-AIR uniquement (cf. SUBS_MODELO_ENVOLVENTE dans
-- lib/constants.ts). Les 26 autres sous-projets restent au modèle historique.
-- La colonne `extremo` est ajoutée pour tout le monde, avec le défaut
-- 'inicio' = comportement actuel, donc sans effet sur eux.
-- ============================================================

-- 1. Point d'accroche sur la CIBLE : « inicio » (défaut, comportement actuel)
--    ou « fin » = la ligne TERMINE à la date visée, son début recule de sa durée.
alter table public.peebcoolsf_roadmap_enlace
  add column if not exists extremo text not null default 'inicio';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'peebcoolsf_roadmap_enlace_extremo_chk'
  ) then
    alter table public.peebcoolsf_roadmap_enlace
      add constraint peebcoolsf_roadmap_enlace_extremo_chk
      check (extremo in ('inicio', 'fin'));
  end if;
end $$;

-- 2. Sauvegarde de l'état SUB-AIR avant conversion (rejouable sans risque).
create table if not exists public.peebcoolsf_bak_enlace_036 as
  select * from public.peebcoolsf_roadmap_enlace where feuille = 'SUB-AIR';

-- 3. Les 15 lignes-repère de SUB-AIR.
insert into public.peebcoolsf_roadmap_estado
  (feuille, tarea_key, creada, componente, fila, orden, nombre, dur_valor, dur_unidad, fecha_inicio)
values ('SUB-AIR', '__ini__estudios_preliminares', true, 'GP', 'estudios_preliminares', -20, 'Inicio de estudios preliminares', 1, 'dia', '2026-07-01')
on conflict (feuille, tarea_key) do nothing;
insert into public.peebcoolsf_roadmap_estado
  (feuille, tarea_key, creada, componente, fila, orden, nombre, dur_valor, dur_unidad, fecha_inicio)
values ('SUB-AIR', '__ent__estudios_preliminares', true, 'GP', 'estudios_preliminares', 900, 'Entrega de los estudios preliminares', 1, 'dia', null)
on conflict (feuille, tarea_key) do nothing;
insert into public.peebcoolsf_roadmap_estado
  (feuille, tarea_key, creada, componente, fila, orden, nombre, dur_valor, dur_unidad, fecha_inicio)
values ('SUB-AIR', '__ini__anteproyecto', true, 'GP', 'anteproyecto', -20, 'Inicio del anteproyecto', 1, 'dia', '2026-08-15')
on conflict (feuille, tarea_key) do nothing;
insert into public.peebcoolsf_roadmap_estado
  (feuille, tarea_key, creada, componente, fila, orden, nombre, dur_valor, dur_unidad, fecha_inicio)
values ('SUB-AIR', '__ent__anteproyecto', true, 'GP', 'anteproyecto', 900, 'Entrega del anteproyecto', 1, 'dia', null)
on conflict (feuille, tarea_key) do nothing;
insert into public.peebcoolsf_roadmap_estado
  (feuille, tarea_key, creada, componente, fila, orden, nombre, dur_valor, dur_unidad, fecha_inicio)
values ('SUB-AIR', '__ini__proyecto_ejecutivo', true, 'GP', 'proyecto_ejecutivo', -20, 'Inicio del proyecto ejecutivo', 1, 'dia', null)
on conflict (feuille, tarea_key) do nothing;
insert into public.peebcoolsf_roadmap_estado
  (feuille, tarea_key, creada, componente, fila, orden, nombre, dur_valor, dur_unidad, fecha_inicio)
values ('SUB-AIR', '__ent__proyecto_ejecutivo', true, 'GP', 'proyecto_ejecutivo', 900, 'Entrega del proyecto ejecutivo', 1, 'dia', null)
on conflict (feuille, tarea_key) do nothing;
insert into public.peebcoolsf_roadmap_estado
  (feuille, tarea_key, creada, componente, fila, orden, nombre, dur_valor, dur_unidad, fecha_inicio)
values ('SUB-AIR', '__ini__redaccion_pliegos', true, 'GP', 'redaccion_pliegos', -20, 'Inicio de la redacción de pliegos', 1, 'dia', null)
on conflict (feuille, tarea_key) do nothing;
insert into public.peebcoolsf_roadmap_estado
  (feuille, tarea_key, creada, componente, fila, orden, nombre, dur_valor, dur_unidad, fecha_inicio)
values ('SUB-AIR', '__ent__redaccion_pliegos', true, 'GP', 'redaccion_pliegos', 900, 'Entrega del pliego', 1, 'dia', null)
on conflict (feuille, tarea_key) do nothing;
insert into public.peebcoolsf_roadmap_estado
  (feuille, tarea_key, creada, componente, fila, orden, nombre, dur_valor, dur_unidad, fecha_inicio)
values ('SUB-AIR', '__ini__licitacion', true, 'GP', 'licitacion', -20, 'Inicio de la licitación', 1, 'dia', null)
on conflict (feuille, tarea_key) do nothing;
insert into public.peebcoolsf_roadmap_estado
  (feuille, tarea_key, creada, componente, fila, orden, nombre, dur_valor, dur_unidad, fecha_inicio)
values ('SUB-AIR', '__ent__licitacion', true, 'GP', 'licitacion', 900, 'Entrega del informe de evaluación', 1, 'dia', null)
on conflict (feuille, tarea_key) do nothing;
insert into public.peebcoolsf_roadmap_estado
  (feuille, tarea_key, creada, componente, fila, orden, nombre, dur_valor, dur_unidad, fecha_inicio)
values ('SUB-AIR', '__ini__obra', true, 'GP', 'obra', -20, 'Inicio de la obra', 1, 'dia', null)
on conflict (feuille, tarea_key) do nothing;
insert into public.peebcoolsf_roadmap_estado
  (feuille, tarea_key, creada, componente, fila, orden, nombre, dur_valor, dur_unidad, fecha_inicio)
values ('SUB-AIR', '__ent__obra', true, 'GP', 'obra', 900, 'Recepción de obra', 1, 'dia', null)
on conflict (feuille, tarea_key) do nothing;
insert into public.peebcoolsf_roadmap_estado
  (feuille, tarea_key, creada, componente, fila, orden, nombre, dur_valor, dur_unidad, fecha_inicio)
values ('SUB-AIR', '__cno__no_objecion_afd', true, 'GP', 'redaccion_pliegos', 950, 'No objeción AFD', 2, 'semana', null)
on conflict (feuille, tarea_key) do nothing;
insert into public.peebcoolsf_roadmap_estado
  (feuille, tarea_key, creada, componente, fila, orden, nombre, dur_valor, dur_unidad, fecha_inicio)
values ('SUB-AIR', '__cno__no_objecion_afd_atribucion', true, 'GP', 'licitacion', 950, 'No objeción AFD — Atribución', 2, 'semana', null)
on conflict (feuille, tarea_key) do nothing;
insert into public.peebcoolsf_roadmap_estado
  (feuille, tarea_key, creada, componente, fila, orden, nombre, dur_valor, dur_unidad, fecha_inicio)
values ('SUB-AIR', '__cno__no_objecion_afd_contrato', true, 'GP', 'licitacion', 950, 'No objeción AFD — Contrato', 2, 'semana', null)
on conflict (feuille, tarea_key) do nothing;

-- 4. Réécriture des liaisons de SUB-AIR.
--    Les 31 « tarea → sa propre fase » deviennent des liaisons vers les repères
--    (16 vers Inicio, 13 vers Entrega, 1 après Entrega) ;
--    les 2 liaisons issues des fases CNO pointent vers les jalons ;
--    les 7 liaisons vers un nœud de phase disparaissent (remplacées par
--    l'enchaînement des repères) ; les 8 liaisons tarea → tarea sont intactes.
delete from public.peebcoolsf_roadmap_enlace where feuille = 'SUB-AIR';
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', '__ini__estudios_preliminares', '__ent__estudios_preliminares', 'inicio', 2, 'mes', 'inicio')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', '__ini__anteproyecto', '__ent__anteproyecto', 'inicio', 10, 'semana', 'inicio')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', '__ini__proyecto_ejecutivo', '__ent__proyecto_ejecutivo', 'inicio', 10, 'semana', 'inicio')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', '__ini__redaccion_pliegos', '__ent__redaccion_pliegos', 'inicio', 2, 'semana', 'inicio')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', '__ini__obra', '__ent__obra', 'inicio', 26, 'semana', 'inicio')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', 'gp-lic-analisis', '__ent__licitacion', 'fin', 0, 'dia', 'inicio')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', 'validacion_anteproyecto', '__ini__proyecto_ejecutivo', 'fin', 0, 'dia', 'inicio')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', '__ent__proyecto_ejecutivo', '__ini__redaccion_pliegos', 'fin', 0, 'dia', 'inicio')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', '__ent__redaccion_pliegos', '__cno__no_objecion_afd', 'fin', 0, 'dia', 'inicio')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', '__cno__no_objecion_afd', '__ini__licitacion', 'fin', 0, 'dia', 'inicio')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', '__ent__licitacion', '__cno__no_objecion_afd_atribucion', 'fin', 0, 'dia', 'inicio')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', 'gp-lic-negociacion', '__cno__no_objecion_afd_contrato', 'fin', 0, 'dia', 'inicio')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', '__cno__no_objecion_afd_contrato', '__ini__obra', 'fin', 0, 'dia', 'inicio')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', '__ent__anteproyecto', 'ee-antep-comprobacion', 'inicio', 0, 'semana', 'fin')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', '__ent__anteproyecto', 'ee-antep-mv', 'inicio', -1, 'semana', 'fin')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', '__ent__anteproyecto', 'genero-antep-revision', 'inicio', 0, 'semana', 'fin')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', '__ent__anteproyecto', 'genero-antep-secretaria', 'inicio', 0, 'semana', 'fin')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', '__ent__anteproyecto', 'genero-antep-validacion', 'inicio', 0, 'semana', 'fin')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', '__ent__anteproyecto', 'Identificación de los otros planes de gestión relevantes para el proyecto', 'inicio', 0, 'semana', 'fin')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', '__ini__anteproyecto', 'Identificación de requisitos para intervenciones aeroportuarias', 'inicio', 0, 'dia', 'inicio')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', '__ent__anteproyecto', 'Plan preliminar de continuidad de los servicios', 'inicio', 0, 'semana', 'fin')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', '__ent__anteproyecto', 'Redacción de memoria descriptiva del anteproyecto', 'inicio', 0, 'semana', 'fin')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', '__ent__anteproyecto', 'validacion_anteproyecto', 'fin', 0, 'dia', 'inicio')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', '__cno__no_objecion_afd', 'gp-lic-publicacion', 'fin', 0, 'dia', 'inicio')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', '__cno__no_objecion_afd_atribucion', 'gp-lic-negociacion', 'fin', 0, 'dia', 'inicio')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', '__ini__obra', 'Aprobación y seguimiento del PGASC', 'inicio', 0, 'dia', 'inicio')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', '__ini__obra', 'Conformidad del cronograma con el plan de continuidad', 'inicio', 0, 'dia', 'inicio')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', '__ini__obra', 'Coordinación y seguimiento de los planes solicitados', 'inicio', 0, 'dia', 'inicio')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', '__ent__obra', 'ee-obra-mv', 'inicio', 0, 'mes', 'fin')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', '__ini__obra', 'Gestión de reclamos', 'inicio', 0, 'dia', 'inicio')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', '__ent__proyecto_ejecutivo', 'ee-pe-comprobacion', 'inicio', 0, 'semana', 'fin')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', '__ent__proyecto_ejecutivo', 'ee-pe-especificaciones', 'inicio', 0, 'semana', 'fin')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', '__ent__proyecto_ejecutivo', 'ee-pe-mv', 'inicio', -1, 'semana', 'fin')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', '__ent__proyecto_ejecutivo', 'genero-pe-revision', 'inicio', 0, 'semana', 'fin')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', '__ini__proyecto_ejecutivo', 'Lineamientos de los planes para la gestión de los aspectos ambientales', 'inicio', 0, 'dia', 'inicio')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', '__ini__proyecto_ejecutivo', 'Lineamientos de los programas/planes para la gestión de trabajo, condiciones laborales y SST', 'inicio', 0, 'dia', 'inicio')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', '__ini__proyecto_ejecutivo', 'Plan de continuidad de los servicios', 'inicio', 0, 'dia', 'inicio')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', '__ini__redaccion_pliegos', 'Asegurar la integración de los lineamientos establecidos en la fase anterior', 'inicio', 0, 'dia', 'inicio')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', '__ini__redaccion_pliegos', 'genero-pliegos-clausulas', 'inicio', 0, 'dia', 'inicio')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', '__ini__redaccion_pliegos', 'genero-pliegos-criterios', 'inicio', 0, 'dia', 'inicio')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', '__ini__redaccion_pliegos', 'genero-pliegos-elm', 'inicio', 0, 'dia', 'inicio')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', '__ini__redaccion_pliegos', 'genero-pliegos-inclusion', 'inicio', 0, 'dia', 'inicio')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', '__ini__redaccion_pliegos', 'genero-pliegos-lenguaje', 'inicio', 0, 'dia', 'inicio')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', '__ini__redaccion_pliegos', 'Participación de experto AyS en la redacción del pliego', 'inicio', 0, 'dia', 'inicio')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', 'ee-ep-actualizacion-modelo', 'ee-ep-aprobacion-criterio', 'fin', -1, 'semana', 'inicio')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', 'gp-lic-analisis', 'ee-lic-mv', 'inicio', 0, 'dia', 'inicio')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', 'gp-lic-analisis', 'genero-licitacion-evaluacion', 'inicio', 0, 'dia', 'inicio')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', 'gp-lic-analisis', 'Verificación de las ofertas AyS según criterios AyS', 'inicio', 0, 'dia', 'inicio')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', 'gp-lic-analisis', 'Verificación de los Planes de Gestión AyS propuestos', 'inicio', 0, 'dia', 'inicio')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', 'gp-lic-publicacion', 'gp-lic-analisis', 'fin', 0, 'dia', 'inicio')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', 'Pre-categorización provincial digital', 'Categorización provincial', 'fin', 0, 'dia', 'inicio')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', 'Redacción de memoria descriptiva del anteproyecto', 'Pre-categorización provincial digital', 'fin', 0, 'dia', 'inicio')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', '__ini__redaccion_pliegos', 'ee-pliegos-mv', 'inicio', 0, 'dia', 'inicio')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
