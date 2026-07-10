-- ============================================================
-- 023 — Reconnecter les liaisons du planning après 022.
-- La 022 a supprimé le nœud de phase « __fase__validacion_anteproyecto »
-- (devenu la tarea GP « validacion_anteproyecto »). Les liaisons de la chaîne
--   Anteproyecto → Validación de anteproyecto → Proyecto ejecutivo
-- pointaient encore sur l'ancien nœud de phase → chaîne cassée, dates du
-- cronograma (vue global surtout) décalées. On repointe ces liaisons vers la
-- CARTE pour préserver l'enchaînement (la carte a hérité de la durée 1 semana).
-- Idempotent. execute_sql (dev).
-- ============================================================

update public.peebcoolsf_roadmap_enlace
  set hacia = 'validacion_anteproyecto'
  where hacia = '__fase__validacion_anteproyecto';

update public.peebcoolsf_roadmap_enlace
  set desde = 'validacion_anteproyecto'
  where desde = '__fase__validacion_anteproyecto';
