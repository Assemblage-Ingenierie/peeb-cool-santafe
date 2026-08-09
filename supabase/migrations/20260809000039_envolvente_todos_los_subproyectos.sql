-- ============================================================
-- 039 — Le modèle « la fase est l'ENVELOPPE de ses tâches » est étendu aux
-- 26 sous-projets restants (SUB-AIR l'avait déjà, migrations 036-038).
--
-- Le préalable était que la conversion soit MÉCANIQUE : vérifié, les 26 se
-- répartissent en deux formes seulement — 16 avec les cartes Patrimonio
-- (48 liaisons, 33 « fase → tarea ») et 10 sans (46 / 31) — toutes deux
-- identiques à celle de SUB-AIR avant conversion.
--
-- ⚠ Neutralité des dates : les dates de fase saisies dans `gestion_lineas`
-- portaient l'ÉCHELONNEMENT du programme entre bâtiments. L'enchaînement
-- automatique l'aurait effacé (Cullen −417 j, Centenario −318 j, ASV −75 j,
-- les 23 autres ≈ 0). Cette attente est donc reportée sur le DÉCALAGE de la
-- liaison `__ent__estudios_preliminares → __ini__anteproyecto` : pas de date
-- absolue de plus, et l'attente suit si les études préliminaires bougent.
--
-- Sauvegardes : `peebcoolsf_bak_enlace_039` (liaisons) et
-- `peebcoolsf_bak_fechas_039` (dates absolues effacées).
-- ============================================================

create table if not exists public.peebcoolsf_bak_enlace_039 as
  select * from public.peebcoolsf_roadmap_enlace where feuille <> 'SUB-AIR';
create table if not exists public.peebcoolsf_bak_fechas_039 as
  select feuille, tarea_key, fecha_inicio, fecha_fin from public.peebcoolsf_roadmap_estado
  where fecha_inicio is not null and feuille like 'SUB-%';

-- 1. Repères Inicio / Entrega des 6 fases. Dates et durées lues dans
--    gestion_lineas : rien n'est inventé. Seule date absolue conservée :
--    le démarrage des estudios preliminares, départ de toute la chaîne.
with etiquetas(fase, nom_ini, nom_ent) as (values
  ('estudios_preliminares','Inicio de estudios preliminares','Entrega de los estudios preliminares'),
  ('anteproyecto','Inicio del anteproyecto','Entrega del anteproyecto'),
  ('proyecto_ejecutivo','Inicio del proyecto ejecutivo','Entrega del proyecto ejecutivo'),
  ('redaccion_pliegos','Inicio de la redacción de pliegos','Entrega del pliego'),
  ('licitacion','Inicio de la licitación','Entrega del informe de evaluación'),
  ('obra','Inicio de la obra','Recepción de obra')
),
base as (
  select g.subproyecto_uid as uid, g.fase, e.nom_ini, e.nom_ent, g.fecha_inicio
  from public.peebcoolsf_gestion_lineas g
  join etiquetas e on e.fase = g.fase
  where g.tipo_linea = 'etapa' and g.subproyecto_uid <> 'SUB-AIR'
)
insert into public.peebcoolsf_roadmap_estado
  (feuille, tarea_key, creada, componente, fila, orden, nombre, dur_valor, dur_unidad, fecha_inicio)
select uid, '__ini__'||fase, true, 'GP', fase, -20, nom_ini, 1, 'dia',
       case when fase = 'estudios_preliminares' then fecha_inicio end from base
union all
select uid, '__ent__'||fase, true, 'GP', fase, 900, nom_ent, 1, 'dia', null from base
on conflict (feuille, tarea_key) do nothing;

-- 2. Jalons « No objeción AFD » : hors fase, donc ils n'allongent aucune enveloppe.
with cno(code, fila, nombre) as (values
  ('no_objecion_afd','redaccion_pliegos','No objeción AFD'),
  ('no_objecion_afd_atribucion','licitacion','No objeción AFD — Atribución'),
  ('no_objecion_afd_contrato','licitacion','No objeción AFD — Contrato')
)
insert into public.peebcoolsf_roadmap_estado
  (feuille, tarea_key, creada, componente, fila, orden, nombre, dur_valor, dur_unidad, fecha_inicio)
select g.subproyecto_uid, '__cno__'||c.code, true, 'GP', c.fila, 950, c.nombre,
       coalesce(g.dur_valor, 2), coalesce(g.dur_unidad, 'semana'), null
from public.peebcoolsf_gestion_lineas g
join cno c on c.code = g.fase
where g.tipo_linea = 'etapa' and g.subproyecto_uid <> 'SUB-AIR'
on conflict (feuille, tarea_key) do nothing;

-- 3. Conversion des liaisons « fase → tarea » (mêmes règles qu'en 036) :
--    famille A (punto=inicio) → repère Inicio ; famille B (punto=fin) → remise,
--    en accrochant la FIN de la tâche (extremo='fin') avec l'écart
--    `desfase + durée` ; les fases CNO deviennent les jalons. Le cas où l'unité
--    du décalage diffère de celle de la durée (la validation d'anteproyecto)
--    passe APRÈS la remise.
with src as (
  select e.feuille, e.desde, e.hacia, e.punto, e.desfase_valor, e.desfase_unidad,
         substring(e.desde from 9) as fase, s.dur_valor, s.dur_unidad
  from public.peebcoolsf_roadmap_enlace e
  left join public.peebcoolsf_roadmap_estado s on s.feuille = e.feuille and s.tarea_key = e.hacia
  where e.feuille <> 'SUB-AIR' and e.desde like '\_\_fase\_\_%' and e.hacia not like '\_\_fase\_\_%'
)
insert into public.peebcoolsf_roadmap_enlace
  (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
select feuille,
  case when fase like 'no_objecion_afd%' then '__cno__'||fase
       when punto = 'inicio' then '__ini__'||fase else '__ent__'||fase end,
  hacia,
  case when fase like 'no_objecion_afd%' then punto
       when punto = 'inicio' then 'inicio'
       when desfase_unidad = dur_unidad and dur_valor is not null then 'inicio' else 'fin' end,
  case when fase like 'no_objecion_afd%' then desfase_valor
       when punto = 'inicio' then desfase_valor
       when desfase_unidad = dur_unidad and dur_valor is not null then desfase_valor + dur_valor else 0 end,
  case when fase like 'no_objecion_afd%' then desfase_unidad
       when punto = 'inicio' then desfase_unidad
       when desfase_unidad = dur_unidad and dur_valor is not null then desfase_unidad else 'dia' end,
  case when fase like 'no_objecion_afd%' then 'inicio'
       when punto = 'inicio' then 'inicio'
       when desfase_unidad = dur_unidad and dur_valor is not null then 'fin' else 'inicio' end
from src
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;

-- 4. Les nœuds `__fase__` ne sont plus planifiables : la fase découle de ses lignes.
delete from public.peebcoolsf_roadmap_enlace
where feuille <> 'SUB-AIR' and (desde like '\_\_fase\_\_%' or hacia like '\_\_fase\_\_%');

-- 5. Durée de chaque fase = écart Inicio → Entrega. La licitación fait
--    exception : elle se ferme sur l'analyse des offres, pas sur un délai.
insert into public.peebcoolsf_roadmap_enlace
  (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
select g.subproyecto_uid, '__ini__'||g.fase, '__ent__'||g.fase, 'inicio',
       coalesce(g.dur_valor, 0), coalesce(g.dur_unidad, 'dia'), 'inicio'
from public.peebcoolsf_gestion_lineas g
where g.tipo_linea = 'etapa' and g.subproyecto_uid <> 'SUB-AIR'
  and g.fase in ('estudios_preliminares','anteproyecto','proyecto_ejecutivo','redaccion_pliegos','obra')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;

-- 6. La chaîne d'avancement, identique à SUB-AIR.
with pares(desde, hacia) as (values
  ('gp-lic-analisis','__ent__licitacion'),
  ('__ent__estudios_preliminares','__ini__anteproyecto'),
  ('validacion_anteproyecto','__ini__proyecto_ejecutivo'),
  ('__ent__proyecto_ejecutivo','validacion_proyecto_ejecutivo'),
  ('validacion_proyecto_ejecutivo','__ini__redaccion_pliegos'),
  ('__ent__redaccion_pliegos','__cno__no_objecion_afd'),
  ('__cno__no_objecion_afd','__ini__licitacion'),
  ('__ent__licitacion','__cno__no_objecion_afd_atribucion'),
  ('gp-lic-negociacion','__cno__no_objecion_afd_contrato'),
  ('__cno__no_objecion_afd_contrato','__ini__obra')
)
insert into public.peebcoolsf_roadmap_enlace
  (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
select s.uid, p.desde, p.hacia, 'fin', 0, 'dia', 'inicio'
from public.peebcoolsf_subproyectos s cross join pares p where s.uid <> 'SUB-AIR'
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;

-- 7. Les trois lignes qui restaient sans ancre ou avec une date absolue.
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
select uid, '__ini__redaccion_pliegos', 'ee-pliegos-mv', 'inicio', 0, 'dia', 'inicio'
from public.peebcoolsf_subproyectos where uid <> 'SUB-AIR'
on conflict (feuille, desde, hacia) do nothing;

insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
select uid, '__ini__estudios_preliminares', 'ee-ep-actualizacion-modelo', 'inicio', 0, 'dia', 'inicio'
from public.peebcoolsf_subproyectos where uid <> 'SUB-AIR'
on conflict (feuille, desde, hacia) do nothing;

insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
select uid, '__ent__estudios_preliminares', 'genero-ep-formacion', 'inicio', 0, 'dia', 'inicio'
from public.peebcoolsf_subproyectos where uid <> 'SUB-AIR'
on conflict (feuille, desde, hacia) do nothing;

-- ⚠ Ces deux dernières tâches portaient une date absolue qui, contrairement à
-- SUB-AIR, ne coïncidait AVEC AUCUN repère (2 cas sur 26 seulement, écarts de
-- −396 à +151 jours). Les rattacher les déplace : c'est le prix de « plus
-- aucune date absolue ». L'ancien état est dans peebcoolsf_bak_fechas_039.
update public.peebcoolsf_roadmap_estado set fecha_inicio = null
where feuille like 'SUB-%' and fecha_inicio is not null
  and tarea_key <> '__ini__estudios_preliminares';

-- 8. Neutralité des dates : l'attente entre la fin des EP et le début de
--    l'anteproyecto (l'échelonnement du programme) passe dans le décalage.
with ep as (
  select subproyecto_uid uid,
    case dur_unidad when 'mes' then fecha_inicio + (dur_valor||' month')::interval
                    when 'semana' then fecha_inicio + (dur_valor*7||' day')::interval
                    else fecha_inicio + (dur_valor||' day')::interval end::date as fin_ep
  from public.peebcoolsf_gestion_lineas where tipo_linea='etapa' and fase='estudios_preliminares'
),
ap as (select subproyecto_uid uid, fecha_inicio as ini_ap
       from public.peebcoolsf_gestion_lineas where tipo_linea='etapa' and fase='anteproyecto')
update public.peebcoolsf_roadmap_enlace e
set desfase_valor = greatest(ap.ini_ap - ep.fin_ep, 0), desfase_unidad = 'dia'
from ep join ap on ap.uid = ep.uid
where e.feuille = ep.uid and e.feuille <> 'SUB-AIR'
  and e.desde = '__ent__estudios_preliminares' and e.hacia = '__ini__anteproyecto'
  and ap.ini_ap > ep.fin_ep;
