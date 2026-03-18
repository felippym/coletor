-- Garante que a coluna observation existe em inventories (caso 007 não tenha sido aplicada)
alter table public.inventories add column if not exists observation text;
