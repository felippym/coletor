-- ============================================
-- Lojas, usuários com loja, inventários com loja e usuário
-- Execute após 001-005. Para novos setups, use setup-completo-v2.sql
-- ============================================

-- 1. Tabela de lojas
create table if not exists public.lojas (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

insert into public.lojas (name) values ('Leblon'), ('Ipanema')
on conflict (name) do nothing;

-- 2. Usuários: adicionar loja_id
alter table public.users add column if not exists loja_id uuid references public.lojas(id);

-- Associar usuários às lojas (admin não tem loja)
update public.users set loja_id = (select id from public.lojas where name = 'Leblon' limit 1) where username = 'leblon';
update public.users set loja_id = (select id from public.lojas where name = 'Ipanema' limit 1) where username = 'ipanema';

create index if not exists idx_users_loja_id on public.users (loja_id);

-- 3. Inventários: adicionar loja_id e usuario_id (nullable para retrocompatibilidade)
alter table public.inventories add column if not exists loja_id uuid references public.lojas(id);
alter table public.inventories add column if not exists usuario_id uuid references public.users(id);

create index if not exists idx_inventories_loja_id on public.inventories (loja_id);
create index if not exists idx_inventories_usuario_id on public.inventories (usuario_id);
