-- ============================================================
-- Migration 013 — Retrait de la « medida » AyS (bascule vers Requisitos AyS)
-- Incrémentale. Idempotente. execute_sql (projet EXTERNAL).
--   • AyS n'est plus une mesure du projet : son texte a été migré dans
--     subproyectos.ays_texto (migration 012) et la checklist vit dans
--     peebcoolsf_ays_requisitos. On supprime donc les lignes medidas 'ays'.
--   • À exécuter APRÈS la migration 012 (qui copie le texte).
-- ============================================================

delete from public.peebcoolsf_medidas where medida = 'ays';
