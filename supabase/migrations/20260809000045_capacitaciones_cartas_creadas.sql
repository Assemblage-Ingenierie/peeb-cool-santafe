-- ============================================================
-- Migration 045 — Capacitaciones du « Proyecto global » = cartes CRÉÉES.
--
-- La vue globale du cronograma est scindée en « Gestión de proyecto » et
-- « Capacitaciones ». Cette dernière n'est plus une paire de libellés figés dans
-- le code : ce sont désormais de vraies cartes créées de la feuille « global »
-- (fila-sentinelle « cap »), pour que l'admin puisse ÉDITER LE NOM, EN AJOUTER et
-- EN SUPPRIMER depuis le mode Editar — même mécanique que les lignes libres.
--
-- On sème les deux capacitaciones connues, à clé stable. Sans plan (fecha/durée) :
-- elles s'affichent sans barre tant qu'elles ne sont pas planifiées.
-- Idempotent : `on conflict do nothing` (ne réécrit pas un nom déjà personnalisé).
-- ============================================================

insert into peebcoolsf_roadmap_estado
  (feuille, tarea_key, creada, componente, fila, nombre, orden, banda, oculta, realizada)
values
  ('global', 'capacitacion-ee',     true, 'EE', 'cap', 'Capacitaciones Eficiencia Energética', 1, 0, false, false),
  ('global', 'capacitacion-genero', true, 'G',  'cap', 'Capacitaciones Género',                2, 0, false, false)
on conflict (feuille, tarea_key) do nothing;
