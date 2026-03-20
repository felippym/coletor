-- Tickets de revisão de produto (EAN + fotos), persistidos no Supabase pela API (service role).

create table if not exists public.product_review_tickets (
  id uuid primary key,
  funcionario text not null,
  ean text not null,
  photo_ean text not null,
  photo_produto text not null,
  created_at timestamptz not null default now(),
  created_by text
);

create index if not exists product_review_tickets_created_at_idx
  on public.product_review_tickets (created_at desc);

comment on table public.product_review_tickets is 'Revisar Produto: EAN, fotos em JPEG (data URL ou base64) e funcionário.';

alter table public.product_review_tickets enable row level security;

-- Acesso direto pelo cliente anon não é usado; a API usa service_role (ignora RLS).
-- Políticas permissivas caso no futuro o app use o cliente Supabase no browser:
drop policy if exists "Allow all product_review_tickets anon" on public.product_review_tickets;
create policy "Allow all product_review_tickets anon"
  on public.product_review_tickets
  for all
  to anon
  using (true)
  with check (true);
