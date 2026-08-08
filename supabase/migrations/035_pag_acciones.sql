-- ============================================================
-- 035 — Implementación del PAG : planning des 33 acciones.
--
-- Le CATALOGUE des acciones (libellés, impactos, chaînes, responsables) vit dans
-- le code (`lib/pag.ts`), comme ROADMAP_TAREAS : il n'a pas à être en base.
-- Ce qui est semé ici, ce sont les ENTRÉES de planification — ancre de début,
-- durée estimée, fin manuelle des acciones continues — dans la table d'état
-- existante, feuille « pag ». Elles restent modifiables depuis le mode Admin de
-- la feuille (le PAG n'est PAS branché dans la section /admin).
--
-- Ces dates sont une PROPOSITION : la colonne « Fecha en la que podría iniciarse »
-- du fichier PAG est vide sur 45 lignes sur 49. Elles ont été déduites des
-- semestres (colonne D), des durées (colonne L) et des enchaînements (M/N).
--
-- IDEMPOTENTE : `on conflict do nothing` — rejouer la migration n'écrase aucune
-- date saisie à la main.
-- ============================================================

insert into public.peebcoolsf_roadmap_estado
  (feuille, tarea_key, fecha_inicio, dur_valor, dur_unidad, fecha_fin)
values
  -- C1 · Gobernanza institucional
  ('pag', 'pag-3.3.1',  date '2026-09-01',  3, 'semana', null),
  ('pag', 'pag-3.1.1',  date '2026-09-22',  2, 'semana', null),
  ('pag', 'pag-3.2.1',  date '2026-10-06',  3, 'semana', null),
  ('pag', 'pag-3.5.1',  date '2026-09-01', 12, 'semana', null),
  ('pag', 'pag-3.4.1',  date '2027-03-01', 12, 'semana', null),
  ('pag', 'pag-1.1.1',  date '2026-09-01',  2, 'semana', null),
  -- C2 · Formación del equipo del proyecto
  ('pag', 'pag-4.1.1',  date '2026-10-01',  3, 'semana', null),
  ('pag', 'pag-4.1.2',  date '2026-10-22',  2, 'semana', null),
  ('pag', 'pag-4.1.3',  date '2026-11-05',  2, 'semana', null),
  ('pag', 'pag-4.1.4',  date '2026-11-19',  4, 'semana', null),
  ('pag', 'pag-4.1.5',  date '2027-02-02',  2, 'semana', null),
  ('pag', 'pag-5.1.1',  date '2026-11-19',  3, 'semana', null),
  -- C3 · Comunicación inclusiva
  ('pag', 'pag-5.1.2',  date '2026-10-01',  3, 'semana', null),
  ('pag', 'pag-5.2.1',  date '2027-02-02',  3, 'semana', null),
  ('pag', 'pag-5.3.1',  date '2027-03-01',  3, 'semana', null),
  -- C4 · Compras públicas inclusivas y ELM
  ('pag', 'pag-10.2.1', date '2026-09-01',  3, 'semana', null),
  ('pag', 'pag-10.1.1', date '2026-09-22',  3, 'semana', null),
  ('pag', 'pag-9.2.1',  date '2026-10-13',  4, 'semana', null),
  ('pag', 'pag-9.3.1',  date '2026-11-10',  4, 'semana', null),
  ('pag', 'pag-9.4.1',  date '2026-11-10',  4, 'semana', null),
  ('pag', 'pag-10.4.1', date '2026-11-10',  4, 'semana', null),
  -- C5 · Empleabilidad de mujeres
  ('pag', 'pag-9.1.2',  date '2027-03-01',  3, 'semana', null),
  ('pag', 'pag-9.1.1',  date '2027-04-05',  8, 'semana', null),
  ('pag', 'pag-9.1.3',  date '2027-08-02',  8, 'semana', null),
  ('pag', 'pag-9.5.1',  date '2027-08-02',  8, 'semana', null),
  -- C6 · Prevención de violencia y reclamos (8.4.1 et 8.2.1 : sans terme)
  ('pag', 'pag-8.3.1',  date '2027-02-01',  8, 'semana', null),
  ('pag', 'pag-8.1.1',  date '2027-04-05',  4, 'semana', null),
  ('pag', 'pag-8.4.1',  date '2027-04-05',  4, 'semana', date '2030-10-22'),
  ('pag', 'pag-8.2.1',  date '2027-03-29',  4, 'semana', date '2030-10-22'),
  -- C7 · Monitoreo con enfoque de género (11.1.2 et 11.1.4 : sans terme)
  ('pag', 'pag-11.1.1', date '2026-10-01',  4, 'semana', null),
  ('pag', 'pag-11.1.2', date '2026-11-01',  4, 'semana', date '2030-10-22'),
  ('pag', 'pag-11.1.3', date '2026-11-10',  4, 'semana', null),
  ('pag', 'pag-11.1.4', date '2028-09-01',  8, 'semana', date '2030-10-22')
on conflict (feuille, tarea_key) do nothing;
