-- Funcionários (nomes para o campo Funcionário em Revisar Produto e demais fluxos).

create table if not exists public.funcionarios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists funcionarios_nome_lower_uidx
  on public.funcionarios (lower(trim(nome)));

create index if not exists funcionarios_nome_idx
  on public.funcionarios (nome);

comment on table public.funcionarios is 'Nomes de funcionários; lista compartilhada (API com service role).';

alter table public.funcionarios enable row level security;

drop policy if exists "Allow all funcionarios anon" on public.funcionarios;
create policy "Allow all funcionarios anon"
  on public.funcionarios
  for all
  to anon
  using (true)
  with check (true);
