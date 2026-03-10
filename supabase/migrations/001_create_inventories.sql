-- Tabela de inventários
create table if not exists public.inventories (
  id uuid primary key,
  name text not null,
  created_at timestamptz not null default now(),
  items jsonb not null default '[]'::jsonb
);

-- Habilitar RLS (Row Level Security)
alter table public.inventories enable row level security;

-- Remover política antiga se existir
drop policy if exists "Allow all for inventories" on public.inventories;

-- Política para permitir leitura e escrita (anon key)
create policy "Allow all for inventories"
  on public.inventories
  for all
  to anon
  using (true)
  with check (true);

-- Também para authenticated (caso use login no futuro)
drop policy if exists "Allow authenticated for inventories" on public.inventories;
create policy "Allow authenticated for inventories"
  on public.inventories
  for all
  to authenticated
  using (true)
  with check (true);
