-- Tabela de usuários para autenticação
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

-- Índice para busca por username (login)
create index if not exists idx_users_username on public.users (lower(username));

-- RLS: sem políticas = acesso negado para anon/authenticated
-- A API usa service_role (bypass RLS) para validar login
alter table public.users enable row level security;

-- Seed: usuários com os mesmos hashes do auth-hashes.json
insert into public.users (username, password_hash) values
  ('admin', '$2b$10$MR4.0TDj51sqcjIs/vCEEucJl2wr.OrZrvVcWWPpGbY6QeWLoqSWi'),
  ('leblon', '$2b$10$9HrLCi0V/zqaEnZZJYtVl.RBZjIzjkPNT1ohz7LAHiHutCLPJmHzi'),
  ('ipanema', '$2b$10$Q7f4dIdIPZ1OucWxSTvam.jQxi9nfT0ODd.i7pzprpyvVEF61Pj/y')
on conflict (username) do update set password_hash = excluded.password_hash;
