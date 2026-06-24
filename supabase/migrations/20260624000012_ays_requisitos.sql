-- ============================================================
-- Migration 012 — Requisitos AyS (nouveau mécanisme) — CDC §4.5
-- Incrémentale. Idempotente. execute_sql (projet EXTERNAL).
--   • AyS quitte « Medidas del proyecto » et devient une checklist dédiée :
--     table peebcoolsf_ays_requisitos (1 ligne par plan MGAS × sous-projet,
--     case activa) + colonne subproyectos.ays_texto (texte libre, 1/sous-projet).
--   • 17 plans MGAS (§10.5.1→8, §10.6.1→5, §10.7.1→4) pré-remplis (activa=false).
--   • Migration : le texte de l'ancienne « medida » AyS est copié dans ays_texto.
--     (Les lignes medidas.ays sont supprimées plus tard, à la bascule UI.)
--   • RLS : lecture authenticated, écriture admin (motif des autres tables).
-- ============================================================

create table if not exists public.peebcoolsf_ays_requisitos (
  subproyecto_uid text not null references public.peebcoolsf_subproyectos(uid) on delete cascade,
  requisito       text not null,
  activa          boolean not null default false,
  primary key (subproyecto_uid, requisito)
);

alter table public.peebcoolsf_ays_requisitos enable row level security;

drop policy if exists "ays_req_sel" on public.peebcoolsf_ays_requisitos;
create policy "ays_req_sel" on public.peebcoolsf_ays_requisitos for select to authenticated using (true);
drop policy if exists "ays_req_admin" on public.peebcoolsf_ays_requisitos;
create policy "ays_req_admin" on public.peebcoolsf_ays_requisitos for all to authenticated
  using ((select peebcoolsf_private.is_admin())) with check ((select peebcoolsf_private.is_admin()));

alter table public.peebcoolsf_subproyectos add column if not exists ays_texto text;

-- Pré-remplissage : 17 plans × chaque sous-projet (idempotent).
insert into public.peebcoolsf_ays_requisitos (subproyecto_uid, requisito)
select s.uid, r.code
from public.peebcoolsf_subproyectos s
cross join (values
  ('10.5.1'),('10.5.2'),('10.5.3'),('10.5.4'),('10.5.5'),('10.5.6'),('10.5.7'),('10.5.8'),
  ('10.6.1'),('10.6.2'),('10.6.3'),('10.6.4'),('10.6.5'),
  ('10.7.1'),('10.7.2'),('10.7.3'),('10.7.4')
) as r(code)
on conflict (subproyecto_uid, requisito) do nothing;

-- Migration du texte AyS existant (medidas.ays.texto) → subproyectos.ays_texto.
update public.peebcoolsf_subproyectos s
set ays_texto = m.texto
from public.peebcoolsf_medidas m
where m.subproyecto_uid = s.uid and m.medida = 'ays' and m.texto is not null and s.ays_texto is null;
