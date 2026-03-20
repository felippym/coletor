-- Extensão para índice trigram (busca por substring)
create extension if not exists pg_trgm with schema extensions;

-- Base fiscal (planilha de regras importada para consulta)
create table if not exists public.fiscal_regras (
  id bigserial primary key,
  row_data jsonb not null,
  search_text text not null
);

comment on table public.fiscal_regras is 'Linhas da planilha fiscal (JSON); search_text para busca textual.';

create index if not exists fiscal_regras_search_text_idx on public.fiscal_regras using gin (search_text gin_trgm_ops);

alter table public.fiscal_regras enable row level security;

drop policy if exists "Allow read fiscal_regras for anon" on public.fiscal_regras;
create policy "Allow read fiscal_regras for anon"
  on public.fiscal_regras
  for select
  to anon
  using (true);

drop policy if exists "Allow read fiscal_regras for authenticated" on public.fiscal_regras;
create policy "Allow read fiscal_regras for authenticated"
  on public.fiscal_regras
  for select
  to authenticated
  using (true);

-- Busca: todas as palavras (substring) devem aparecer em search_text
create or replace function public.search_fiscal_regras(search_terms text[], result_limit int)
returns table (row_data jsonb)
language sql
stable
security definer
set search_path = public
as $$
  select f.row_data
  from public.fiscal_regras f
  where (
    select coalesce(
      bool_and(strpos(f.search_text, lower(trim(t))) > 0),
      false
    )
    from unnest(search_terms) as t
    where trim(t) <> ''
  )
  limit greatest(1, least(coalesce(result_limit, 300), 500));
$$;

comment on function public.search_fiscal_regras(text[], int) is 'Consulta fiscal: AND de substrings em search_text.';

grant execute on function public.search_fiscal_regras(text[], int) to anon, authenticated, service_role;
