-- ============================================================
-- 044 — Corrige la cible de 043 : « recoller » l'anteproyecto aux estudios
-- preliminares pour les 5 écoles D'ORIGINE (pas le lot Norte).
--
-- 043 avait appliqué le recollage au lot Norte (SUB-ESC-*) par erreur ; le
-- client visait les 5 écoles préexistantes de Rosario/Santa Fe Capital :
--   SUB-E67, SUB-E407, SUB-E574, SUB-E1109, SUB-E331.
--
--   1) Annulation de 043 : le lot Norte reprend son AP FIXE (041) = 2028-11-01.
--   2) Les 5 écoles d'origine ont déjà l'AP dérivé (fecha null) mais avec un
--      décalage de 12 j après l'entrega EP → on le met à 0 j (recollage).
--
-- Sauvegarde du décalage d'origine dans `peebcoolsf_private.bak_e_ap_link_044`.
-- Idempotente.
-- ============================================================

create table if not exists peebcoolsf_private.bak_e_ap_link_044 as
  select feuille, desde, hacia, desfase_valor, desfase_unidad, punto, extremo
  from peebcoolsf_roadmap_enlace
  where hacia='__ini__anteproyecto' and desde='__ent__estudios_preliminares'
  and feuille in ('SUB-E67','SUB-E407','SUB-E574','SUB-E1109','SUB-E331');

-- 1) Annulation de 043 : lot Norte → AP fixe 2028-11-01 (comme 041).
update peebcoolsf_roadmap_estado set fecha_inicio='2028-11-01'
  where tarea_key='__ini__anteproyecto'
  and feuille in ('SUB-ESC-006','SUB-ESC-004','SUB-ESC-003','SUB-ESC-002','SUB-ESC-001');

-- 2) Recollage des 5 écoles d'origine : décalage EP→AP 12 j → 0 j.
update peebcoolsf_roadmap_enlace set desfase_valor=0
  where hacia='__ini__anteproyecto' and desde='__ent__estudios_preliminares'
  and feuille in ('SUB-E67','SUB-E407','SUB-E574','SUB-E1109','SUB-E331');
