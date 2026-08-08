-- ============================================================
-- Migration 033 — Cronogramas des 9 sous-projets d'origine, alignés sur
-- « PEEB Santa Fe - AT Etapa 1 - Cronograma.xlsx » (AT Étape 1).
--
-- PÉRIMÈTRE : uniquement les 9 sous-projets d'origine. Les 18 écoles ajoutées
-- par la migration 031 (SUB-ESC-*) sont VOLONTAIREMENT EXCLUES — l'Excel les
-- traite en trois lots « Escuelas no auditadas / x5 » encore prévisionnels.
--
-- LECTURE DE L'EXCEL (Gantt en cellules colorées, 4 colonnes = 1 mois,
-- origine août 2026 ; les initiales de mois sont FRANÇAISES : J F M A M J J A S O N D) :
--   Actualizacion      #FFE599 -> estudios_preliminares (écoles seulement)
--   Anteproyecto (UG)  #C9DAF8 -> anteproyecto
--   Proy. Ejec. (UE)   #A4C2F4 -> proyecto_ejecutivo
--   bande rose  #F4CCCC (avant licitación) -> redaccion_pliegos + no_objecion_afd
--   Licitacion         #EA9999 -> licitacion
--   bande rose  #F4CCCC (après licitación) -> no_objecion_afd_atribucion + no_objecion_afd_contrato
--   Obras #FCE5CD (+ Vacaciones #FBDDBE) -> obra, du premier au dernier segment
--
-- Les bandes roses font 4 semaines et se scindent en 2 + 2, ce qui retombe
-- exactement sur les durées déjà en base : bonne confirmation du découpage.
-- L'app n'a pas de notion de « vacaciones » : la fase `obra` couvre les
-- interruptions estivales, conformément au tracé de l'Excel.
--
-- Correspondance des lignes de l'Excel :
--   AIR -> SUB-AIR | ASV -> SUB-ASV
--   « Escuelas (x3 Rosario) » -> SUB-E67, SUB-E407, SUB-E574
--   « Escuelas (x2 Santa Fe) » -> SUB-E1109, SUB-E331
--   H. Centenario -> SUB-CENTENARIO | Hospital Cullen -> SUB-CULLEN
--
-- NON MODIFIÉ : `estudios_preliminares` des aéroports et hôpitaux (l'Excel ne
-- porte aucune barre pour eux) et la ligne `general` — 13 lignes sur 90.
--
-- Sauvegarde de l'état antérieur : table `peebcoolsf_bak_fases_031` (90 lignes).
-- ============================================================

update public.peebcoolsf_gestion_lineas as g
set fecha_inicio = v.ini, dur_valor = v.sem, dur_unidad = 'semana', fecha_fin = null
from (values
  ('SUB-AIR','anteproyecto','2026-08-15'::date,10),
  ('SUB-AIR','proyecto_ejecutivo','2026-11-01'::date,10),
  ('SUB-AIR','redaccion_pliegos','2027-01-15'::date,2),
  ('SUB-AIR','no_objecion_afd','2027-02-01'::date,2),
  ('SUB-AIR','licitacion','2027-02-15'::date,8),
  ('SUB-AIR','no_objecion_afd_atribucion','2027-04-15'::date,2),
  ('SUB-AIR','no_objecion_afd_contrato','2027-05-01'::date,2),
  ('SUB-AIR','obra','2027-05-15'::date,26),
  ('SUB-ASV','anteproyecto','2026-11-15'::date,8),
  ('SUB-ASV','proyecto_ejecutivo','2027-01-15'::date,8),
  ('SUB-ASV','redaccion_pliegos','2027-03-15'::date,2),
  ('SUB-ASV','no_objecion_afd','2027-04-01'::date,2),
  ('SUB-ASV','licitacion','2027-04-15'::date,8),
  ('SUB-ASV','no_objecion_afd_atribucion','2027-06-15'::date,2),
  ('SUB-ASV','no_objecion_afd_contrato','2027-07-01'::date,2),
  ('SUB-ASV','obra','2027-07-15'::date,18),
  ('SUB-E67','estudios_preliminares','2026-11-01'::date,8),
  ('SUB-E67','anteproyecto','2027-01-08'::date,16),
  ('SUB-E67','proyecto_ejecutivo','2027-05-08'::date,16),
  ('SUB-E67','redaccion_pliegos','2027-09-08'::date,2),
  ('SUB-E67','no_objecion_afd','2027-09-22'::date,2),
  ('SUB-E67','licitacion','2027-10-08'::date,8),
  ('SUB-E67','no_objecion_afd_atribucion','2027-12-08'::date,2),
  ('SUB-E67','no_objecion_afd_contrato','2027-12-22'::date,2),
  ('SUB-E67','obra','2028-01-08'::date,59),
  ('SUB-E407','estudios_preliminares','2026-11-01'::date,8),
  ('SUB-E407','anteproyecto','2027-01-08'::date,16),
  ('SUB-E407','proyecto_ejecutivo','2027-05-08'::date,16),
  ('SUB-E407','redaccion_pliegos','2027-09-08'::date,2),
  ('SUB-E407','no_objecion_afd','2027-09-22'::date,2),
  ('SUB-E407','licitacion','2027-10-08'::date,8),
  ('SUB-E407','no_objecion_afd_atribucion','2027-12-08'::date,2),
  ('SUB-E407','no_objecion_afd_contrato','2027-12-22'::date,2),
  ('SUB-E407','obra','2028-01-08'::date,59),
  ('SUB-E574','estudios_preliminares','2026-11-01'::date,8),
  ('SUB-E574','anteproyecto','2027-01-08'::date,16),
  ('SUB-E574','proyecto_ejecutivo','2027-05-08'::date,16),
  ('SUB-E574','redaccion_pliegos','2027-09-08'::date,2),
  ('SUB-E574','no_objecion_afd','2027-09-22'::date,2),
  ('SUB-E574','licitacion','2027-10-08'::date,8),
  ('SUB-E574','no_objecion_afd_atribucion','2027-12-08'::date,2),
  ('SUB-E574','no_objecion_afd_contrato','2027-12-22'::date,2),
  ('SUB-E574','obra','2028-01-08'::date,59),
  ('SUB-E1109','estudios_preliminares','2027-03-08'::date,8),
  ('SUB-E1109','anteproyecto','2027-05-15'::date,12),
  ('SUB-E1109','proyecto_ejecutivo','2027-08-15'::date,12),
  ('SUB-E1109','redaccion_pliegos','2027-11-15'::date,2),
  ('SUB-E1109','no_objecion_afd','2027-12-01'::date,2),
  ('SUB-E1109','licitacion','2027-12-15'::date,8),
  ('SUB-E1109','no_objecion_afd_atribucion','2028-02-15'::date,2),
  ('SUB-E1109','no_objecion_afd_contrato','2028-03-01'::date,2),
  ('SUB-E1109','obra','2028-03-15'::date,50),
  ('SUB-E331','estudios_preliminares','2027-03-08'::date,8),
  ('SUB-E331','anteproyecto','2027-05-15'::date,12),
  ('SUB-E331','proyecto_ejecutivo','2027-08-15'::date,12),
  ('SUB-E331','redaccion_pliegos','2027-11-15'::date,2),
  ('SUB-E331','no_objecion_afd','2027-12-01'::date,2),
  ('SUB-E331','licitacion','2027-12-15'::date,8),
  ('SUB-E331','no_objecion_afd_atribucion','2028-02-15'::date,2),
  ('SUB-E331','no_objecion_afd_contrato','2028-03-01'::date,2),
  ('SUB-E331','obra','2028-03-15'::date,50),
  ('SUB-CENTENARIO','anteproyecto','2027-08-15'::date,16),
  ('SUB-CENTENARIO','proyecto_ejecutivo','2027-12-15'::date,16),
  ('SUB-CENTENARIO','redaccion_pliegos','2028-04-15'::date,2),
  ('SUB-CENTENARIO','no_objecion_afd','2028-05-01'::date,2),
  ('SUB-CENTENARIO','licitacion','2028-05-15'::date,8),
  ('SUB-CENTENARIO','no_objecion_afd_atribucion','2028-07-15'::date,2),
  ('SUB-CENTENARIO','no_objecion_afd_contrato','2028-08-01'::date,2),
  ('SUB-CENTENARIO','obra','2028-08-15'::date,114),
  ('SUB-CULLEN','anteproyecto','2027-11-22'::date,11),
  ('SUB-CULLEN','proyecto_ejecutivo','2028-02-15'::date,12),
  ('SUB-CULLEN','redaccion_pliegos','2028-05-15'::date,2),
  ('SUB-CULLEN','no_objecion_afd','2028-06-01'::date,2),
  ('SUB-CULLEN','licitacion','2028-06-15'::date,8),
  ('SUB-CULLEN','no_objecion_afd_atribucion','2028-08-15'::date,2),
  ('SUB-CULLEN','no_objecion_afd_contrato','2028-09-01'::date,2),
  ('SUB-CULLEN','obra','2028-09-15'::date,40)
) as v(uid, fase, ini, sem)
where g.tipo_linea = 'etapa' and g.subproyecto_uid = v.uid and g.fase = v.fase;