-- ============================================================
-- verify_seed.sql — Vérification du seed PEEB Cool Santa Fe
-- Exécuter dans l'éditeur SQL Supabase après le seed.
-- Comparer avec le tableau §5 du CAHIER_DES_CHARGES_FR.md.
-- ============================================================

-- 1. Sous-projets avec métriques de faisabilité
--    (les colonnes calculées sont affichées ici pour validation,
--     elles ne sont PAS stockées en base)
SELECT
  s.uid,
  s.nombre,
  s.tipologia,
  s.seccion,
  s.superficie_m2,
  s.lat,
  s.lng,
  -- Métriques faisabilidad
  m.demanda_kwh,
  m.demanda_despues_kwh,
  ROUND(
    ((m.demanda_kwh - m.demanda_despues_kwh) / NULLIF(m.demanda_kwh, 0) * 100)::NUMERIC, 1
  )                              AS economia_pct,
  ROUND((m.demanda_despues_kwh / NULLIF(s.superficie_m2, 0))::NUMERIC, 2)
                                 AS kwh_m2_despues,
  m.gei_antes_tco2,
  m.gei_despues_tco2,
  m.costo_ee_eur,
  m.costo_otras_eur,
  -- Bénéficiaires
  m.benef_personal,
  m.benef_personal_pct_muj,
  m.benef_usuarios,
  m.benef_usuarios_pct_muj,
  m.benef_indirectos,
  m.benef_indirectos_pct_muj
FROM subproyectos s
LEFT JOIN metricas m
  ON m.subproyecto_uid = s.uid
 AND m.escenario = 'faisabilidad'
ORDER BY s.orden;

-- ============================================================
-- 2. Lignes de gestion par sous-projet
-- ============================================================
SELECT
  gl.uid,
  gl.subproyecto_uid,
  gl.titulo,
  gl.orden
FROM gestion_lineas gl
ORDER BY gl.subproyecto_uid, gl.orden;

-- ============================================================
-- 3. Documentation GP
-- ============================================================
SELECT uid, nombre_documento, orden
FROM documentacion_gp
ORDER BY orden;

-- ============================================================
-- 4. Capacitaciones (documents)
-- ============================================================
SELECT uid, subseccion, titulo, orden
FROM capacitaciones_documentos
ORDER BY subseccion, orden;

-- ============================================================
-- 5. Comptages de contrôle
-- ============================================================
SELECT
  (SELECT COUNT(*) FROM subproyectos)              AS nb_subproyectos,      -- attendu : 9
  (SELECT COUNT(*) FROM metricas)                  AS nb_metricas,          -- attendu : 18 (9 × 2 scénarios)
  (SELECT COUNT(*) FROM metricas WHERE escenario = 'faisabilidad') AS nb_faisabilidad, -- 9
  (SELECT COUNT(*) FROM metricas WHERE escenario = 'proyecto')     AS nb_proyecto,     -- 9
  (SELECT COUNT(*) FROM documentacion_gp)          AS nb_doc_gp,            -- attendu : 6
  (SELECT COUNT(*) FROM capacitaciones_documentos) AS nb_cap_docs,          -- attendu : 9
  (SELECT COUNT(*) FROM gestion_lineas)            AS nb_gestion_lineas;    -- attendu : 36 (9 × 4)
