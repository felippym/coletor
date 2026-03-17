-- Execute este SQL no Supabase Dashboard > SQL Editor para criar a tabela nfe_conferences

-- 1. Criar tabela de conferências NFe
create table if not exists public.nfe_conferences (
  id uuid primary key,
  key text not null default '',
  invoice_number text not null default '',
  supplier_name text not null default '',
  issue_date text not null default '',
  products jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.nfe_conferences enable row level security;

drop policy if exists "Allow all for nfe_conferences" on public.nfe_conferences;
create policy "Allow all for nfe_conferences"
  on public.nfe_conferences
  for all
  to anon
  using (true)
  with check (true);

drop policy if exists "Allow authenticated for nfe_conferences" on public.nfe_conferences;
create policy "Allow authenticated for nfe_conferences"
  on public.nfe_conferences
  for all
  to authenticated
  using (true)
  with check (true);

-- 2. Adicionar coluna observation
alter table public.nfe_conferences
  add column if not exists observation text;

-- 3. Adicionar coluna started_by
alter table public.nfe_conferences
  add column if not exists started_by text;
