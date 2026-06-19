-- ============================================================
-- verify_seed.sql — Vérification du seed PEEB Cool Santa Fe
-- Tables peebcoolsf_ (projet EXTERNAL). Exécuter après le seed.
-- Comparer avec le tableau §5 du CAHIER_DES_CHARGES_FR.md.
-- ============================================================

-- 1. Sous-projets + métriques faisabilité (colonnes calculées affichées pour validation,
--    NON stockées en base)
select
  s.uid,
  s.nombre,
  s.tipologia,
  s.seccion,
  s.superficie_m2,
  s.lat,
  s.lng,
  m.demanda_kwh,
  m.demanda_despues_kwh,
  round(((m.demanda_kwh - m.demanda_despues_kwh) / nullif(m.demanda_kwh, 0) * 100)::numeric, 1) as economia_pct,
  round((m.demanda_despues_kwh / nullif(s.superficie_m2, 0))::numeric, 2)                        as kwh_m2_despues,
  m.gei_antes_tco2,
  m.gei_despues_tco2,
  m.costo_ee_eur,
  m.costo_otras_eur,
  m.benef_personal, m.benef_personal_pct_muj,
  m.benef_usuarios, m.benef_usuarios_pct_muj,
  m.benef_indirectos, m.benef_indirectos_pct_muj
from public.peebcoolsf_subproyectos s
left join public.peebcoolsf_metricas m
  on m.subproyecto_uid = s.uid and m.escenario = 'faisabilidad'
order by s.orden;

-- 2. Lignes de gestion par sous-projet
select uid, subproyecto_uid, titulo, orden
from public.peebcoolsf_gestion_lineas
order by subproyecto_uid, orden;

-- 3. Documentation GP
select uid, nombre_documento, orden from public.peebcoolsf_documentacion_gp order by orden;

-- 4. Capacitaciones (documents)
select uid, subseccion, titulo, orden from public.peebcoolsf_capacitaciones_documentos order by subseccion, orden;

-- 5. Comptages de contrôle
select
  (select count(*) from public.peebcoolsf_subproyectos)              as nb_subproyectos,      -- 9
  (select count(*) from public.peebcoolsf_metricas)                  as nb_metricas,          -- 18
  (select count(*) from public.peebcoolsf_metricas where escenario='faisabilidad') as nb_faisabilidad, -- 9
  (select count(*) from public.peebcoolsf_metricas where escenario='proyecto')     as nb_proyecto,     -- 9
  (select count(*) from public.peebcoolsf_documentacion_gp)          as nb_doc_gp,            -- 6
  (select count(*) from public.peebcoolsf_capacitaciones_documentos) as nb_cap_docs,          -- 9
  (select count(*) from public.peebcoolsf_gestion_lineas)            as nb_gestion_lineas;    -- 36

-- 6. Contrôle RLS actif partout (doit retourner 16 lignes, toutes rowsecurity = true)
select tablename, rowsecurity
from pg_tables
where schemaname = 'public' and tablename like 'peebcoolsf\_%'
order by tablename;
