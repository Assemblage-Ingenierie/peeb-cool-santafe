-- ============================================================
-- 021 — Nettoyage automatique du roadmap à la suppression d'un sous-projet.
--
-- peebcoolsf_roadmap_estado / _enlace sont rattachés au sous-projet par la
-- colonne texte `feuille` (= uid), SANS clé étrangère : une FK est impossible
-- car `feuille` vaut aussi 'global' (feuille « Proyecto global », sans sous-projet).
-- Résultat : le ON DELETE CASCADE ne les touche pas → lignes orphelines.
--
-- On rétablit l'équivalent d'un CASCADE via un trigger AFTER DELETE sur
-- peebcoolsf_subproyectos. Filet de sécurité indépendant du code applicatif
-- (l'action deleteSubproyecto fait déjà le ménage explicitement).
-- ============================================================

create or replace function peebcoolsf_private.cleanup_roadmap_on_subproyecto_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.peebcoolsf_roadmap_estado where feuille = old.uid;
  delete from public.peebcoolsf_roadmap_enlace where feuille = old.uid;
  return old;
end;
$$;

drop trigger if exists trg_sub_roadmap_cleanup on public.peebcoolsf_subproyectos;
create trigger trg_sub_roadmap_cleanup
  after delete on public.peebcoolsf_subproyectos
  for each row execute function peebcoolsf_private.cleanup_roadmap_on_subproyecto_delete();
