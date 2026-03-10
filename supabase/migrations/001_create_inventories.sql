-- Tabela de inventários
create table if not exists public.inventories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  items jsonb not null default '[]'::jsonb
);

-- Habilitar RLS (Row Level Security)
alter table public.inventories enable row level security;

-- Política para permitir leitura e escrita anônima (ajuste conforme sua autenticação)
create policy "Allow all for inventories"
  on public.inventories
  for all
  using (true)
  with check (true);
