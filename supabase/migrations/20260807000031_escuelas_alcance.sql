-- ============================================================
-- Migration 031 — Escuelas del alcance (18 établissements, 17 sites)
--
-- Remplace le pool d'écoles FACTICES (ex-lib/subproyectos-hipoteticos.ts, supprimé)
-- par la vraie liste du périmètre. Source : « PEEB_Santa_Fe_escuelas_coordenadas.xlsx »
-- (tabla general PEEB Santa Fe, juin 2025 ; matrículas M.E.E.S.I. août 2026).
--
-- Les 5 écoles préexistantes (SUB-E67/E407/E574/E1109/E331, Rosario & Santa Fe
-- Capital) sont CONSERVÉES → 23 écoles au total.
--
-- Colonnes de la source volontairement NON reprises (aucun équivalent au schéma) :
-- Matrícula, Región, Lote de estudio, Lote de obra.
--
-- ⚠ Superficies laissées à NULL pour 3 établissements (CEF N°51, Esc. Normal
-- Superior N°41, E.E.S.O.P.I. N°8160). La source les signale « sin superficie /
-- no cuantificada », et son propre total le confirme : somme des 18 cellules
-- = 39 027 m², total affiché = 35 127 m², écart = 3 900 = 2 406 + 1 301 + 193,
-- soit exactement ces trois valeurs. Règle projet : donnée manquante = NULL
-- (affiché « — »), jamais une valeur douteuse.
--
-- ⚠ Coordonnées « a confirmar en sitio » pour CEF N°51 (point de la LOCALITÉ) et
-- E.E.S.O.P.I. N°8160 (point de l'établissement). Chargées telles quelles.
--
-- Hojas de ruta / cronograma : COPIÉS depuis une école « typique » existante.
--   • plantilla SUB-E67  → écoles à valeur patrimoniale (jeu standard + les 2
--     cartes « Patrimonio ») ;
--   • plantilla SUB-E574 → écoles sans valeur patrimoniale (jeu standard).
-- Le classement patrimonial est HEURISTIQUE (à confirmer) : cf. SUBS_PATRIMONIO
-- dans lib/constants.ts, qui doit rester synchronisé avec la colonne `plantilla`.
--
-- Idempotent : tout est en `on conflict do nothing`.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Les 18 sous-projets (tipología E, sección Escuelas), du nord au sud.
--    `orden` 10..27 (les 9 sous-projets existants occupent 1..9).
-- ------------------------------------------------------------
insert into public.peebcoolsf_subproyectos
  (uid, nombre, tipologia, seccion, orden, direccion, lat, lng, superficie_m2)
values
  ('SUB-ESC-001','EPCD N°749 "Gregoria Matorras de San Martín"','E','Escuelas',10::smallint,'Gregoria Pérez de Denis, Nueve de Julio',-28.226642,-61.527030,1050::double precision),
  ('SUB-ESC-002','CEF N°51 – Centro de Educación Física','E','Escuelas',11,'Avellaneda, General Obligado',-29.117651,-59.657362,null),
  ('SUB-ESC-003','EETP N°642 "Mercedes San Martín de Balcarce"','E','Escuelas',12,'Calchaquí, Vera',-29.888715,-60.282931,5929),
  ('SUB-ESC-004','EPCD N°438 "Joaquín V. González"','E','Escuelas',13,'Alejandra, San Javier',-29.908804,-59.825971,1165),
  ('SUB-ESC-005','EPCD N°559 "Bartolomé Mitre"','E','Escuelas',14,'Suardi, San Cristóbal',-30.532206,-61.960318,1525),
  ('SUB-ESC-006','EETP N°277 "Fray Francisco Castañeda"','E','Escuelas',15,'San Justo, San Justo',-30.788029,-60.587929,3235),
  ('SUB-ESC-007','EPCD N°6093 "Paraná Medio"','E','Escuelas',16,'Santa Rosa de Calchines, Garay',-31.420923,-60.332197,1025),
  ('SUB-ESC-008','EPCD N°1001 "Santiago Puzzi"','E','Escuelas',17,'Frontera, Castellanos',-31.435434,-62.064712,2800),
  ('SUB-ESC-009','EESO N°371 "Soldados de la Patria: Colombo Muller"','E','Escuelas',18,'Esperanza, Las Colonias',-31.457161,-60.920512,1600),
  ('SUB-ESC-010','Esc. Normal Superior N°41 "José de San Martín"','E','Escuelas',19,'San Jorge, San Martín',-31.901086,-61.858604,null),
  ('SUB-ESC-011','EETP N°475 "Ingeniero Francisco Zimmermann"','E','Escuelas',20,'San Jorge, San Martín',-31.905308,-61.862351,3260),
  ('SUB-ESC-012','E.E.S.O.P.I. N°8160 "José Manuel Estrada"','E','Escuelas',21,'Centeno, San Jerónimo',-32.294981,-61.408484,null),
  ('SUB-ESC-013','EPCD N°257 "General José de San Martín"','E','Escuelas',22,'Serodino, Iriondo',-32.603554,-60.945330,660),
  ('SUB-ESC-014','EETP N°477 "Combate de San Lorenzo"','E','Escuelas',23,'San Lorenzo, San Lorenzo',-32.726164,-60.732889,4200),
  ('SUB-ESC-015','EPCD N°263 "Domingo Faustino Sarmiento"','E','Escuelas',24,'Tortugas, Belgrano',-32.744176,-61.820130,680),
  ('SUB-ESC-016','EPCD N°6029 "José Pedroni"','E','Escuelas',25,'Berabevú, Caseros',-33.341242,-61.858439,1490),
  ('SUB-ESC-017','Jardín de Infantes N°48 "El Cielito"','E','Escuelas',26,'Santa Teresa, Constitución',-33.437294,-60.790002,1798),
  ('SUB-ESC-018','EETP N°281 "General Manuel Savio"','E','Escuelas',27,'Firmat, General López',-33.458335,-61.492010,4710)
on conflict (uid) do nothing;

-- ------------------------------------------------------------
-- 2. Métricas : 2 lignes vides par école (faisabilidad + proyecto).
--    Aucun indicateur chiffré n'est connu → tous les numériques restent NULL.
-- ------------------------------------------------------------
insert into public.peebcoolsf_metricas (subproyecto_uid, escenario)
select s.uid, e.escenario
from public.peebcoolsf_subproyectos s
cross join (values ('faisabilidad'), ('proyecto')) as e(escenario)
where s.uid like 'SUB-ESC-%'
on conflict (subproyecto_uid, escenario) do nothing;

-- ------------------------------------------------------------
-- 3. Requisitos AyS : les 17 plans, décochés (activa=false par défaut),
--    comme le fait addSchool() pour toute nouvelle école.
-- ------------------------------------------------------------
insert into public.peebcoolsf_ays_requisitos (subproyecto_uid, requisito)
select s.uid, r.requisito
from public.peebcoolsf_subproyectos s
cross join (
  select distinct requisito from public.peebcoolsf_ays_requisitos
  where subproyecto_uid = 'SUB-E574'
) r
where s.uid like 'SUB-ESC-%'
on conflict (subproyecto_uid, requisito) do nothing;

-- ------------------------------------------------------------
-- 4. Lignes de fase (tipo_linea='etapa') + leur planning, copiées du template.
--    Les ancres de phase (fecha_inicio) et durées sont IDENTIQUES entre les deux
--    templates → une seule source suffit ici (SUB-E574).
--    Ces lignes portent les ancres utilisées par le moteur de planning.
-- ------------------------------------------------------------
insert into public.peebcoolsf_gestion_lineas
  (uid, subproyecto_uid, titulo, orden, tipo_linea, fase, fecha_inicio, fecha_fin, dur_valor, dur_unidad)
select
  'GEST-' || replace(s.uid, 'SUB-', '') || '-' || g.fase,
  s.uid, g.titulo, g.orden, 'etapa', g.fase,
  g.fecha_inicio, g.fecha_fin, g.dur_valor, g.dur_unidad
from public.peebcoolsf_subproyectos s
cross join (
  select titulo, orden, fase, fecha_inicio, fecha_fin, dur_valor, dur_unidad
  from public.peebcoolsf_gestion_lineas
  where subproyecto_uid = 'SUB-E574' and tipo_linea = 'etapa'
) g
where s.uid like 'SUB-ESC-%'
on conflict (uid) do nothing;

-- ------------------------------------------------------------
-- 5. Feuille de route : état + planning des cartes, copiés du template propre à
--    chaque école (patrimonial ou non). `feuille` = uid du sous-projet.
--    `realizada` est volontairement remis à false : le template porte l'avancement
--    d'une AUTRE école, qui ne dit rien de celles-ci.
-- ------------------------------------------------------------
insert into public.peebcoolsf_roadmap_estado
  (feuille, tarea_key, realizada, comentario, nombre, descripcion, responsable,
   oculta, fila, orden, banda, componente, creada, fecha_inicio, fecha_fin, dur_valor, dur_unidad)
select
  n.uid, e.tarea_key, false, null, e.nombre, e.descripcion, e.responsable,
  e.oculta, e.fila, e.orden, e.banda, e.componente, e.creada,
  e.fecha_inicio, e.fecha_fin, e.dur_valor, e.dur_unidad
from (
  values
    ('SUB-ESC-001','SUB-E574'), ('SUB-ESC-002','SUB-E574'), ('SUB-ESC-003','SUB-E67'),
    ('SUB-ESC-004','SUB-E67'),  ('SUB-ESC-005','SUB-E67'),  ('SUB-ESC-006','SUB-E67'),
    ('SUB-ESC-007','SUB-E574'), ('SUB-ESC-008','SUB-E574'), ('SUB-ESC-009','SUB-E67'),
    ('SUB-ESC-010','SUB-E67'),  ('SUB-ESC-011','SUB-E67'),  ('SUB-ESC-012','SUB-E574'),
    ('SUB-ESC-013','SUB-E67'),  ('SUB-ESC-014','SUB-E67'),  ('SUB-ESC-015','SUB-E67'),
    ('SUB-ESC-016','SUB-E574'), ('SUB-ESC-017','SUB-E67'),  ('SUB-ESC-018','SUB-E67')
) as n(uid, plantilla)
join public.peebcoolsf_roadmap_estado e on e.feuille = n.plantilla
on conflict (feuille, tarea_key) do nothing;

-- ------------------------------------------------------------
-- 6. Feuille de route : liaisons (dépendances) du planning, même appariement.
-- ------------------------------------------------------------
insert into public.peebcoolsf_roadmap_enlace
  (feuille, desde, hacia, punto, desfase_valor, desfase_unidad)
select n.uid, l.desde, l.hacia, l.punto, l.desfase_valor, l.desfase_unidad
from (
  values
    ('SUB-ESC-001','SUB-E574'), ('SUB-ESC-002','SUB-E574'), ('SUB-ESC-003','SUB-E67'),
    ('SUB-ESC-004','SUB-E67'),  ('SUB-ESC-005','SUB-E67'),  ('SUB-ESC-006','SUB-E67'),
    ('SUB-ESC-007','SUB-E574'), ('SUB-ESC-008','SUB-E574'), ('SUB-ESC-009','SUB-E67'),
    ('SUB-ESC-010','SUB-E67'),  ('SUB-ESC-011','SUB-E67'),  ('SUB-ESC-012','SUB-E574'),
    ('SUB-ESC-013','SUB-E67'),  ('SUB-ESC-014','SUB-E67'),  ('SUB-ESC-015','SUB-E67'),
    ('SUB-ESC-016','SUB-E574'), ('SUB-ESC-017','SUB-E67'),  ('SUB-ESC-018','SUB-E67')
) as n(uid, plantilla)
join public.peebcoolsf_roadmap_enlace l on l.feuille = n.plantilla
on conflict (feuille, desde, hacia) do nothing;
