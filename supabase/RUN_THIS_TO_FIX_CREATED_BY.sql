-- Adiciona coluna created_by para filtrar por usuário (ipanema, leblon, admin)
alter table public.inventories add column if not exists created_by text;
alter table public.nfe_conferences add column if not exists created_by text;
