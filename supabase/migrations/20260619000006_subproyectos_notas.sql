-- ============================================================
-- Migration 006 — champ notas (texto libre con formato) — Datos del edificio (CDC §4.5)
-- Incrémentale sur le schéma déployé. Idempotente. execute_sql (projet EXTERNAL).
-- notas : HTML restreint (gras <strong> + couleur rouge Assemblage <span style="color:#E30513">
-- + <br>). Assaini à la saisie ET à l'affichage (liste blanche, anti-XSS) ; backstop serveur.
-- ============================================================

alter table public.peebcoolsf_subproyectos
  add column if not exists notas text;
