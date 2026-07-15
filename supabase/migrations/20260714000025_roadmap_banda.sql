-- ============================================================
-- Migration 025 — Hojas de ruta : bande horizontale (compartiment) d'une
-- carte au sein d'une phase. Incrémentale. Idempotente. execute_sql (EXTERNAL).
--
-- Nouvel axe de position, indépendant de `orden` :
--   • banda : compartiment horizontal DANS une phase (fila). Les cartes d'une
--             même banda (toutes colonnes de composante confondues) s'affichent
--             alignées à la même hauteur en vue « Todo » → tâches simultanées.
--             double precision (interpolation au drag, comme `orden`).
--             NULL = bande 0 (compatibilité : comportement inchangé).
--   `orden` reste la clé de tri DANS une cellule (banda × composante).
-- RLS déjà en place (migration 014). Aucune nouvelle table.
-- ============================================================

alter table public.peebcoolsf_roadmap_estado
  add column if not exists banda double precision;
