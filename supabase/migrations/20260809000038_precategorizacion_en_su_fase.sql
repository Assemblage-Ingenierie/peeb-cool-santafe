-- ============================================================
-- 038 — SUB-AIR : « Pre-categorización provincial digital » démarre avec le
-- PROYECTO EJECUTIVO, sa propre phase (et non avec l'anteproyecto).
--
-- Correction de la liaison posée en 037. L'effet était visible immédiatement :
-- la carte appartient à la fase Proyecto ejecutivo, donc l'enveloppe de cette
-- phase commençait par elle — deux mois et demi avant son propre repère
-- `__ini__proyecto_ejecutivo`, en recouvrant tout l'anteproyecto.
--
-- Règle que ce cas illustre : une phase dont l'enveloppe démarre AVANT son
-- repère `Inicio` signale toujours qu'une de ses tâches pend de quelque chose
-- d'antérieur. C'est le meilleur détecteur de câblage douteux du modèle.
-- ============================================================

delete from public.peebcoolsf_roadmap_enlace
where feuille = 'SUB-AIR'
  and desde = '__ini__anteproyecto'
  and hacia = 'Pre-categorización provincial digital';

insert into public.peebcoolsf_roadmap_enlace
  (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values ('SUB-AIR', '__ini__proyecto_ejecutivo', 'Pre-categorización provincial digital', 'inicio', 0, 'dia', 'inicio')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
