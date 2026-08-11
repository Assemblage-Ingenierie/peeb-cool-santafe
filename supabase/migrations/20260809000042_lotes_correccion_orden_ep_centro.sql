-- ============================================================
-- 042 — Correction du phasage des écoles (suite de 041) :
--   • lot CENTRO : démarrage EP corrigé 2027-07-15 → 2027-05-15 (AP inchangé) ;
--   • ORDRE chronologique : plus tôt = plus haut. L'ordre 041 était inversé
--     (Norte, qui démarre le plus tard, en tête). Nouvel ordre par date d'EP
--     croissante : Sur (2027-04-01) → Centro (2027-05-15) → Norte (2027-07-01).
--
-- Sauvegardes : l'état ORIGINAL (pré-041) reste dans `peebcoolsf_private.bak_lotes_041_*`.
-- Idempotente (valeurs fixes).
-- ============================================================

-- Lot Centro : EP au 15/05/2027.
update peebcoolsf_roadmap_estado set fecha_inicio='2027-05-15'
  where tarea_key='__ini__estudios_preliminares'
  and feuille in ('SUB-ESC-012','SUB-ESC-011','SUB-ESC-010','SUB-ESC-009','SUB-ESC-008','SUB-ESC-007','SUB-ESC-005');

-- Ordre chronologique (plus tôt = plus haut) : Sur 10-15, Centro 16-22, Norte 23-27.
update peebcoolsf_subproyectos set orden = case uid
  -- Sur (EP 2027-04-01)
  when 'SUB-ESC-018' then 10 when 'SUB-ESC-017' then 11 when 'SUB-ESC-016' then 12
  when 'SUB-ESC-015' then 13 when 'SUB-ESC-014' then 14 when 'SUB-ESC-013' then 15
  -- Centro (EP 2027-05-15)
  when 'SUB-ESC-012' then 16 when 'SUB-ESC-011' then 17 when 'SUB-ESC-010' then 18
  when 'SUB-ESC-009' then 19 when 'SUB-ESC-008' then 20 when 'SUB-ESC-007' then 21 when 'SUB-ESC-005' then 22
  -- Norte (EP 2027-07-01)
  when 'SUB-ESC-006' then 23 when 'SUB-ESC-004' then 24 when 'SUB-ESC-003' then 25
  when 'SUB-ESC-002' then 26 when 'SUB-ESC-001' then 27
  else orden end
where uid like 'SUB-ESC-%';
