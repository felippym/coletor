-- Tabela de produtos (base de dados)
create table if not exists public.produtos (
  id uuid primary key default gen_random_uuid(),
  codigo text,
  produto text,
  cus_repos numeric,
  pr_venda numeric,
  pr_min numeric,
  qt_estoque numeric,
  created_at timestamptz not null default now()
);

create index if not exists idx_produtos_codigo on public.produtos (codigo);

alter table public.produtos enable row level security;

drop policy if exists "Allow all for produtos" on public.produtos;
create policy "Allow all for produtos"
  on public.produtos for all to anon
  using (true) with check (true);

drop policy if exists "Allow authenticated for produtos" on public.produtos;
create policy "Allow authenticated for produtos"
  on public.produtos for all to authenticated
  using (true) with check (true);
