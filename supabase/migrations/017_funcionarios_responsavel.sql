-- Usuário (loja) responsável por cada funcionário: leblon, ipanema, admin, etc.

alter table public.funcionarios
  add column if not exists responsavel text not null default 'admin';

comment on column public.funcionarios.responsavel is 'Login da loja que “possui” o funcionário; filtro em GET por x-viewer-user.';

drop index if exists funcionarios_nome_lower_uidx;

create unique index if not exists funcionarios_nome_responsavel_lower_uidx
  on public.funcionarios (lower(trim(nome)), lower(trim(responsavel)));

create index if not exists funcionarios_responsavel_idx
  on public.funcionarios (lower(trim(responsavel)));
