-- ============================================================
-- 024 — Planning des tâches EE du protocole M&V (durées + liaisons).
-- Les 5 cartes M&V (ROADMAP_TAREAS, ids ee-*-mv, responsable UG) reçoivent
-- leur temporalité pour les 9 sous-projets :
--   • ee-antep-mv   : 2 semanas ; début 3 semanas avant la FIN d'Anteproyecto.
--   • ee-pe-mv      : 2 semanas ; début 3 semanas avant la FIN de Proyecto ejecutivo.
--   • ee-pliegos-mv : 2 semanas (= durée de la fase Redacción de pliegos) ; début
--                     = début de la fase (ancre par défaut, aucune liaison).
--   • ee-lic-mv     : 2 semanas ; mêmes critères que les verificaciones AyS
--                     (liaison depuis « Análisis y atribución » gp-lic-analisis,
--                     inicio + 0).
--   • ee-obra-mv    : 1 mes ; début 1 mes avant la FIN d'Obra.
--
-- Convention projet : on ne stocke que les ENTRÉES (durée, liaisons) ; les dates
-- réelles sont calculées à l'affichage (lib/schedule.ts). Idempotent (upserts).
-- Exécuté via MCP execute_sql (dev). PK estado=(feuille,tarea_key),
-- enlace=(feuille,desde,hacia).
-- ============================================================

-- 1) Durées estimées des cartes M&V (roadmap_estado).
with subs(uid) as (values
  ('SUB-AIR'),('SUB-ASV'),('SUB-CENTENARIO'),('SUB-CULLEN'),
  ('SUB-E67'),('SUB-E407'),('SUB-E574'),('SUB-E1109'),('SUB-E331')),
 tareas(tarea_key, dur_valor, dur_unidad) as (values
  ('ee-antep-mv',   2, 'semana'),
  ('ee-pe-mv',      2, 'semana'),
  ('ee-pliegos-mv', 2, 'semana'),
  ('ee-lic-mv',     2, 'semana'),
  ('ee-obra-mv',    1, 'mes'))
insert into public.peebcoolsf_roadmap_estado (feuille, tarea_key, dur_valor, dur_unidad)
select s.uid, t.tarea_key, t.dur_valor, t.dur_unidad
from subs s cross join tareas t
on conflict (feuille, tarea_key) do update
  set dur_valor = excluded.dur_valor,
      dur_unidad = excluded.dur_unidad;

-- 2) Liaisons de planification (roadmap_enlace). ee-pliegos-mv n'en a pas :
--    il s'ancre par défaut au début de sa fase.
with subs(uid) as (values
  ('SUB-AIR'),('SUB-ASV'),('SUB-CENTENARIO'),('SUB-CULLEN'),
  ('SUB-E67'),('SUB-E407'),('SUB-E574'),('SUB-E1109'),('SUB-E331')),
 enl(hacia, desde, punto, desfase_valor, desfase_unidad) as (values
  ('ee-antep-mv', '__fase__anteproyecto',       'fin',    -3, 'semana'),
  ('ee-pe-mv',    '__fase__proyecto_ejecutivo', 'fin',    -3, 'semana'),
  ('ee-lic-mv',   'gp-lic-analisis',            'inicio',  0, 'dia'),
  ('ee-obra-mv',  '__fase__obra',               'fin',    -1, 'mes'))
insert into public.peebcoolsf_roadmap_enlace (feuille, desde, hacia, punto, desfase_valor, desfase_unidad)
select s.uid, e.desde, e.hacia, e.punto, e.desfase_valor, e.desfase_unidad
from subs s cross join enl e
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto,
      desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad;
