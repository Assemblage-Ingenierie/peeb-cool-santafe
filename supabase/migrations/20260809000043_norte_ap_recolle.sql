-- ============================================================
-- 043 — Lot NORTE : « recoller » anteproyecto aux estudios preliminares.
--
-- 041 avait FIXÉ le démarrage de l'anteproyecto (2028-11-01) pour créer un écart
-- (attente) après les estudios preliminares. Le client veut au contraire que
-- l'AP démarre 0 j après l'entrega des EP pour les 5 écoles du lot Norte.
--
-- La liaison `__ent__estudios_preliminares → __ini__anteproyecto` (punto=fin,
-- desfase 0 día, extremo=inicio) EXISTE déjà (semée en 039) mais était masquée
-- par la date fixe. On remet donc `fecha_inicio` de `__ini__anteproyecto` à NULL
-- → la liaison reprend la main et l'AP se colle à l'entrega des EP.
--
-- Sauvegarde `peebcoolsf_private.bak_norte_ap_043`. Idempotente.
-- ============================================================

create table if not exists peebcoolsf_private.bak_norte_ap_043 as
  select feuille, tarea_key, fecha_inicio from peebcoolsf_roadmap_estado
  where tarea_key='__ini__anteproyecto'
  and feuille in ('SUB-ESC-006','SUB-ESC-004','SUB-ESC-003','SUB-ESC-002','SUB-ESC-001');

update peebcoolsf_roadmap_estado set fecha_inicio=null
  where tarea_key='__ini__anteproyecto'
  and feuille in ('SUB-ESC-006','SUB-ESC-004','SUB-ESC-003','SUB-ESC-002','SUB-ESC-001');
