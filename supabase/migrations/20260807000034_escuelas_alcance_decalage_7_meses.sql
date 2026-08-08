-- ============================================================
-- Migration 034 — Les 18 écoles du périmètre décalées de 7 mois
--
-- PÉRIMÈTRE : uniquement SUB-ESC-* (migration 031). Les 9 sous-projets d'origine,
-- calés sur l'Excel AT Étape 1 (migration 033), ne bougent pas.
--
-- Le décalage porte sur les DEUX tables qui datent le planning d'une école :
--   • peebcoolsf_gestion_lineas (tipo_linea='etapa') : ancres de phase
--       estudios_preliminares 2027-02-01 -> 2027-09-01
--       anteproyecto          2027-04-01 -> 2027-11-01
--   • peebcoolsf_roadmap_estado : cartes datées de la phase estudios preliminares
--       ee-ep-actualizacion-modelo et genero-ep-formacion
--       2026-04-01/05 -> 2026-11-01/05
--
-- Les DURÉES ne changent pas : seules les dates d'ancrage glissent, le moteur
-- de planning (lib/schedule.ts) recalcule le reste par les liaisons.
--
-- `+ interval '7 months'` gère seul les fins de mois et les années bissextiles.
--
-- ⚠ NON idempotent : rejouer ce fichier décalerait de 7 mois SUPPLÉMENTAIRES.
-- Retour en arrière : rejouer avec l'intervalle '-7 months'.
-- ============================================================

update public.peebcoolsf_gestion_lineas
set fecha_inicio = (fecha_inicio + interval '7 months')::date,
    fecha_fin    = case when fecha_fin is null then null
                        else (fecha_fin + interval '7 months')::date end
where subproyecto_uid like 'SUB-ESC-%'
  and tipo_linea = 'etapa'
  and (fecha_inicio is not null or fecha_fin is not null);

update public.peebcoolsf_roadmap_estado
set fecha_inicio = case when fecha_inicio is null then null
                        else (fecha_inicio + interval '7 months')::date end,
    fecha_fin    = case when fecha_fin is null then null
                        else (fecha_fin + interval '7 months')::date end
where feuille like 'SUB-ESC-%'
  and (fecha_inicio is not null or fecha_fin is not null);
