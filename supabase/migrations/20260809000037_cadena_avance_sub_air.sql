-- ============================================================
-- 037 — Recâblage de la chaîne d'avancement (SUB-AIR) + « Validación de
-- proyecto ejecutivo » pour tous les sous-projets.
--
-- Principe posé ici : un sous-projet n'a qu'UNE date absolue, le démarrage de
-- toute la chaîne (`__ini__estudios_preliminares`). Tout le reste se déduit —
-- déplacer ce seul repère décale le sous-projet entier. Les dates saisies à la
-- main ailleurs figeaient des maillons au milieu de la chaîne et bloquaient la
-- propagation.
--
-- Chaîne obtenue :
--   Entrega EP → Inicio AP → Entrega AP → Validación AP → Inicio PE →
--   Entrega PE → Validación PE → Inicio pliegos → Entrega pliego →
--   No objeción AFD → Inicio licitación → Análisis → Entrega informe →
--   CNO Atribución → Negociación → CNO Contrato → Inicio obra → Recepción
--
-- ⚠ Le point 1 ci-dessous touche les 27 sous-projets (nouvelle tâche du
-- référentiel `ROADMAP_TAREAS`) ; tout le reste est limité à SUB-AIR.
-- ============================================================

-- Sauvegarde de l'état SUB-AIR avant recâblage (rejouable sans risque).
create table if not exists public.peebcoolsf_bak_enlace_037 as
  select * from public.peebcoolsf_roadmap_enlace where feuille = 'SUB-AIR';

-- 1. « Validación de proyecto ejecutivo » (lib/constants.ts) : jumelle de
--    « Validación de anteproyecto ». Semée avec sa durée pour TOUS les
--    sous-projets — sans durée elle n'aurait aucune barre. Les 26 encore au
--    modèle historique la placeront au début de leur fase (aucune liaison),
--    ce qui ne déplace rien chez eux.
insert into public.peebcoolsf_roadmap_estado (feuille, tarea_key, dur_valor, dur_unidad)
select uid, 'validacion_proyecto_ejecutivo', 2, 'semana' from public.peebcoolsf_subproyectos
on conflict (feuille, tarea_key) do nothing;

-- 2. Plus aucune date absolue en dehors du démarrage de la chaîne.
--    Les trois tombaient exactement sur un repère existant : les y rattacher
--    (point 4) ne déplace aucune date, mais les rend solidaires de la chaîne.
update public.peebcoolsf_roadmap_estado set fecha_inicio = null
where feuille = 'SUB-AIR'
  and tarea_key in ('__ini__anteproyecto', 'ee-ep-actualizacion-modelo', 'genero-ep-formacion');

-- 3. Liaisons remplacées : à supprimer, sinon elles subsisteraient en parallèle
--    des nouvelles et le moteur retiendrait la plus tardive des deux.
delete from public.peebcoolsf_roadmap_enlace
where feuille = 'SUB-AIR' and (
  (desde = '__ent__proyecto_ejecutivo' and hacia = '__ini__redaccion_pliegos') or
  (desde = 'Redacción de memoria descriptiva del anteproyecto' and hacia = 'Pre-categorización provincial digital')
);

-- 4. Nouvelles liaisons.
insert into public.peebcoolsf_roadmap_enlace
  (feuille, desde, hacia, punto, desfase_valor, desfase_unidad, extremo)
values
  -- L'anteproyecto ne démarre plus à une date fixe : il suit la remise des EP.
  ('SUB-AIR', '__ent__estudios_preliminares', '__ini__anteproyecto', 'fin', 0, 'dia', 'inicio'),
  -- La validation du PE suit sa remise, et c'est elle qui ouvre les pliegos.
  ('SUB-AIR', '__ent__proyecto_ejecutivo', 'validacion_proyecto_ejecutivo', 'fin', 0, 'dia', 'inicio'),
  ('SUB-AIR', 'validacion_proyecto_ejecutivo', '__ini__redaccion_pliegos', 'fin', 0, 'dia', 'inicio'),
  -- Les deux tâches qui portaient une date absolue.
  ('SUB-AIR', '__ini__estudios_preliminares', 'ee-ep-actualizacion-modelo', 'inicio', 0, 'dia', 'inicio'),
  ('SUB-AIR', '__ent__estudios_preliminares', 'genero-ep-formacion', 'inicio', 0, 'dia', 'inicio'),
  -- La pré-catégorisation démarre avec l'anteproyecto (avant : à la fin de la
  -- mémoire descriptive). ⚠ Elle appartient à la fase Proyecto ejecutivo, dont
  -- l'enveloppe commence donc désormais avec l'anteproyecto — chevauchement
  -- assumé, à trancher (déplacer la carte de fase ou l'accepter).
  ('SUB-AIR', '__ini__anteproyecto', 'Pre-categorización provincial digital', 'inicio', 0, 'dia', 'inicio')
on conflict (feuille, desde, hacia) do update
  set punto = excluded.punto, desfase_valor = excluded.desfase_valor,
      desfase_unidad = excluded.desfase_unidad, extremo = excluded.extremo;
