-- ============================================================
-- Migration 017 — Notas (whiteboard admin : post-its libres).
-- Incrémentale. Idempotente. execute_sql (projet EXTERNAL).
--   peebcoolsf_notas : id (UID) · contenido (texte libre) · color
--   (blanco | GP | EE | AyS | G) · x / y (position sur le tableau) · creado_en.
--   Admin uniquement (RLS is_admin en lecture ET écriture). Non exposé au snapshot.
-- ============================================================

create table if not exists public.peebcoolsf_notas (
  id         text primary key,
  contenido  text not null default '',
  color      text not null default 'blanco',
  x          double precision not null default 40,
  y          double precision not null default 40,
  creado_en  timestamptz not null default now()
);

alter table public.peebcoolsf_notas enable row level security;

drop policy if exists "notas_sel" on public.peebcoolsf_notas;
create policy "notas_sel" on public.peebcoolsf_notas for select to authenticated
  using ((select peebcoolsf_private.is_admin()));
drop policy if exists "notas_admin" on public.peebcoolsf_notas;
create policy "notas_admin" on public.peebcoolsf_notas for all to authenticated
  using ((select peebcoolsf_private.is_admin())) with check ((select peebcoolsf_private.is_admin()));
