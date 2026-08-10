-- ============================================================
-- 040 — Retrait de la tarea Género « Formación a los equipos de la UG /
-- Ministerio de línea sobre la incorporación de la perspectiva de género »
-- (clé `genero-ep-formacion`, fase Estudios preliminares) de TOUS les
-- sous-projets.
--
-- La carte elle-même vit dans le code (`ROADMAP_TAREAS`, lib/constants.ts) :
-- elle a été retirée du référentiel dans le même lot. Cette migration nettoie
-- les données DB qui la référençaient — sinon lignes orphelines :
--   • `peebcoolsf_roadmap_estado` : l'override de planning par sous-projet
--     (durée, banda, orden) — 28 lignes ;
--   • `peebcoolsf_roadmap_enlace` : la liaison « __ent__estudios_preliminares →
--     genero-ep-formacion » semée pour chaque sous-projet (037 pour SUB-AIR,
--     039 pour les autres) — 27 lignes. AUCUNE liaison ne PART d'elle (0), donc
--     aucune chaîne d'avancement n'est cassée par ce retrait.
--
-- Sauvegardes dans le schéma privé (restaurables). Idempotente : les `delete`
-- se rejouent sans effet une fois les lignes parties.
-- ============================================================

-- Sauvegardes (une seule fois — `if not exists`).
create table if not exists peebcoolsf_private.bak_estado_genero_formacion_040 as
  select * from peebcoolsf_roadmap_estado where tarea_key = 'genero-ep-formacion';

create table if not exists peebcoolsf_private.bak_enlace_genero_formacion_040 as
  select * from peebcoolsf_roadmap_enlace
  where desde = 'genero-ep-formacion' or hacia = 'genero-ep-formacion';

-- Retrait des liaisons puis des lignes de planning (toutes feuilles).
delete from peebcoolsf_roadmap_enlace
  where desde = 'genero-ep-formacion' or hacia = 'genero-ep-formacion';

delete from peebcoolsf_roadmap_estado
  where tarea_key = 'genero-ep-formacion';
