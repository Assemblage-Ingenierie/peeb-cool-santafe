-- ============================================================
-- Migration 010 — Mesures par sous-projet (Datos de proyecto) — CDC §4.5 (ajustes)
-- Incrémentale sur le schéma déployé. Idempotente. execute_sql (projet EXTERNAL).
--   • Table peebcoolsf_medidas : liste fixe de mesures par sous-projet (comme les
--     fases), pré-remplie. Chaque mesure : activa (case), texto (libre), kwh_anual
--     (kWh/an économisés ; NULL pour AyS). componente FK (EE / G / NULL / AyS).
--   • RLS : lecture authenticated, écriture admin (motif des autres tables).
--   • Seed : 9 mesures × 9 sous-projets (Aislación, Carpinterías, HVAC, Luminarias,
--     Fotovoltaicos, Solar térmica = EE ; Género = G ; Otras = ∅ ; AyS = AyS).
-- ============================================================

create table if not exists public.peebcoolsf_medidas (
  subproyecto_uid text not null references public.peebcoolsf_subproyectos(uid) on delete cascade,
  medida          text not null,
  componente      text references public.peebcoolsf_componentes(code),
  activa          boolean not null default false,
  texto           text,
  kwh_anual       numeric,
  orden           int not null default 0,
  primary key (subproyecto_uid, medida)
);

alter table public.peebcoolsf_medidas enable row level security;

drop policy if exists "medidas_sel" on public.peebcoolsf_medidas;
create policy "medidas_sel" on public.peebcoolsf_medidas for select to authenticated using (true);
drop policy if exists "medidas_admin" on public.peebcoolsf_medidas;
create policy "medidas_admin" on public.peebcoolsf_medidas for all to authenticated
  using ((select peebcoolsf_private.is_admin())) with check ((select peebcoolsf_private.is_admin()));

insert into public.peebcoolsf_medidas (subproyecto_uid, medida, componente, orden)
select s.uid, m.medida, m.componente, m.orden
from public.peebcoolsf_subproyectos s
cross join (values
  ('aislacion', 'EE', 1),
  ('carpinterias', 'EE', 2),
  ('hvac', 'EE', 3),
  ('luminarias', 'EE', 4),
  ('fotovoltaicos', 'EE', 5),
  ('solar_termica', 'EE', 6),
  ('genero', 'G', 7),
  ('otras', null, 8),
  ('ays', 'AyS', 9)
) as m(medida, componente, orden)
on conflict (subproyecto_uid, medida) do nothing;
