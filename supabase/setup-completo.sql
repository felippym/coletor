-- ============================================
-- Setup completo: inventários + usuários
-- Cole este arquivo no Supabase SQL Editor e execute
-- ============================================

-- 1. Tabela de inventários
create table if not exists public.inventories (
  id uuid primary key,
  name text not null,
  created_at timestamptz not null default now(),
  items jsonb not null default '[]'::jsonb,
  status text not null default 'em_contagem'
);

alter table public.inventories enable row level security;

drop policy if exists "Allow all for inventories" on public.inventories;
create policy "Allow all for inventories"
  on public.inventories for all to anon
  using (true) with check (true);

drop policy if exists "Allow authenticated for inventories" on public.inventories;
create policy "Allow authenticated for inventories"
  on public.inventories for all to authenticated
  using (true) with check (true);

-- 2. Tabela de usuários + seed
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_users_username on public.users (lower(username));
alter table public.users enable row level security;

insert into public.users (username, password_hash) values
  ('admin', '$2b$10$MR4.0TDj51sqcjIs/vCEEucJl2wr.OrZrvVcWWPpGbY6QeWLoqSWi'),
  ('leblon', '$2b$10$9HrLCi0V/zqaEnZZJYtVl.RBZjIzjkPNT1ohz7LAHiHutCLPJmHzi'),
  ('ipanema', '$2b$10$sUOVue284p6mgWnCuCgD.Ooi4fnPVHJqXc/6cAZPpd8S91RsvSvNW')
on conflict (username) do update set password_hash = excluded.password_hash;

-- 3. Tabela de conferências NFe
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
  on public.nfe_conferences for all to anon
  using (true) with check (true);

drop policy if exists "Allow authenticated for nfe_conferences" on public.nfe_conferences;
create policy "Allow authenticated for nfe_conferences"
  on public.nfe_conferences for all to authenticated
  using (true) with check (true);
