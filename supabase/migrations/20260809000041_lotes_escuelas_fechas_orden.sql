-- ============================================================
-- 041 — Phasage des 18 écoles du périmètre par LOT (Norte / Centro / Sur).
--
-- Les 3 lots dictent le calendrier de démarrage. Pour chaque école on FIXE deux
-- repères du modèle enveloppe (le reste de la chaîne se déduit) :
--   • `__ini__estudios_preliminares` (fecha_inicio) — démarrage EP ;
--   • `__ini__anteproyecto` (fecha_inicio) — démarrage AP. Ce repère était
--     jusque-là DÉRIVÉ (liaison depuis `__ent__estudios_preliminares`, cf. 039) ;
--     il est désormais FIXÉ par lot → la date manuelle prime, la liaison EP→AP
--     devient inerte. C'est voulu : chaque lot impose une date d'AP dure.
--
-- Et on RÉORDONNE les 18 écoles groupées par lot, dans l'ordre du tableau
-- client (Norte 10-14, Centro 15-21, Sur 22-27) — les 9 autres sous-projets
-- gardent orden 1-9.
--
-- Lots (dates de démarrage) :
--   Norte  : EP 2027-07-01 · AP 2028-11-01
--   Centro : EP 2027-07-15 · AP 2028-07-01
--   Sur    : EP 2027-04-01 · AP 2028-02-01
--
-- Sauvegardes dans `peebcoolsf_private`. Idempotente (mêmes valeurs si rejouée).
-- ============================================================

create table if not exists peebcoolsf_private.bak_lotes_041_estado as
  select feuille, tarea_key, fecha_inicio from peebcoolsf_roadmap_estado
  where feuille like 'SUB-ESC-%' and tarea_key in ('__ini__estudios_preliminares','__ini__anteproyecto');
create table if not exists peebcoolsf_private.bak_lotes_041_orden as
  select uid, orden from peebcoolsf_subproyectos where uid like 'SUB-ESC-%';

-- --- Démarrage estudios preliminares ---
update peebcoolsf_roadmap_estado set fecha_inicio='2027-07-01'
  where tarea_key='__ini__estudios_preliminares'
  and feuille in ('SUB-ESC-006','SUB-ESC-004','SUB-ESC-003','SUB-ESC-002','SUB-ESC-001'); -- Norte
update peebcoolsf_roadmap_estado set fecha_inicio='2027-07-15'
  where tarea_key='__ini__estudios_preliminares'
  and feuille in ('SUB-ESC-012','SUB-ESC-011','SUB-ESC-010','SUB-ESC-009','SUB-ESC-008','SUB-ESC-007','SUB-ESC-005'); -- Centro
update peebcoolsf_roadmap_estado set fecha_inicio='2027-04-01'
  where tarea_key='__ini__estudios_preliminares'
  and feuille in ('SUB-ESC-018','SUB-ESC-017','SUB-ESC-016','SUB-ESC-015','SUB-ESC-014','SUB-ESC-013'); -- Sur

-- --- Démarrage anteproyecto (repère désormais FIXÉ par lot) ---
update peebcoolsf_roadmap_estado set fecha_inicio='2028-11-01'
  where tarea_key='__ini__anteproyecto'
  and feuille in ('SUB-ESC-006','SUB-ESC-004','SUB-ESC-003','SUB-ESC-002','SUB-ESC-001'); -- Norte
update peebcoolsf_roadmap_estado set fecha_inicio='2028-07-01'
  where tarea_key='__ini__anteproyecto'
  and feuille in ('SUB-ESC-012','SUB-ESC-011','SUB-ESC-010','SUB-ESC-009','SUB-ESC-008','SUB-ESC-007','SUB-ESC-005'); -- Centro
update peebcoolsf_roadmap_estado set fecha_inicio='2028-02-01'
  where tarea_key='__ini__anteproyecto'
  and feuille in ('SUB-ESC-018','SUB-ESC-017','SUB-ESC-016','SUB-ESC-015','SUB-ESC-014','SUB-ESC-013'); -- Sur

-- --- Ordre : groupé par lot, dans l'ordre du tableau ---
update peebcoolsf_subproyectos set orden = case uid
  -- Norte
  when 'SUB-ESC-006' then 10 when 'SUB-ESC-004' then 11 when 'SUB-ESC-003' then 12
  when 'SUB-ESC-002' then 13 when 'SUB-ESC-001' then 14
  -- Centro
  when 'SUB-ESC-012' then 15 when 'SUB-ESC-011' then 16 when 'SUB-ESC-010' then 17
  when 'SUB-ESC-009' then 18 when 'SUB-ESC-008' then 19 when 'SUB-ESC-007' then 20 when 'SUB-ESC-005' then 21
  -- Sur
  when 'SUB-ESC-018' then 22 when 'SUB-ESC-017' then 23 when 'SUB-ESC-016' then 24
  when 'SUB-ESC-015' then 25 when 'SUB-ESC-014' then 26 when 'SUB-ESC-013' then 27
  else orden end
where uid like 'SUB-ESC-%';
