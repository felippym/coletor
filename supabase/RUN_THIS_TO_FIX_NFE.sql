-- Execute este SQL no Supabase Dashboard > SQL Editor para corrigir o erro
-- "could not find the 'dest_cnpj' column of nfe_conferences in the schema cache"

alter table public.nfe_conferences add column if not exists started_by text;
alter table public.nfe_conferences add column if not exists supplier_cnpj text;
alter table public.nfe_conferences add column if not exists dest_razao_social text;
alter table public.nfe_conferences add column if not exists dest_cnpj text;
