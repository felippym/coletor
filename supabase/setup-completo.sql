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

-- 3. Lojas e relacionamentos (usuário -> loja, inventário -> loja + usuário)
create table if not exists public.lojas (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);
insert into public.lojas (name) values ('Leblon'), ('Ipanema') on conflict (name) do nothing;

alter table public.users add column if not exists loja_id uuid references public.lojas(id);
update public.users set loja_id = (select id from public.lojas where name = 'Leblon' limit 1) where username = 'leblon';
update public.users set loja_id = (select id from public.lojas where name = 'Ipanema' limit 1) where username = 'ipanema';
create index if not exists idx_users_loja_id on public.users (loja_id);

alter table public.inventories add column if not exists loja_id uuid references public.lojas(id);
alter table public.inventories add column if not exists usuario_id uuid references public.users(id);
create index if not exists idx_inventories_loja_id on public.inventories (loja_id);
create index if not exists idx_inventories_usuario_id on public.inventories (usuario_id);
