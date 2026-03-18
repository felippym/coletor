-- Execute no SQL Editor do Supabase Dashboard se a coluna observation não existir
alter table public.inventories add column if not exists observation text;
