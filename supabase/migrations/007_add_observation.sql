-- Adiciona coluna observação em inventários e conferências NFe
alter table public.inventories
  add column if not exists observation text;

alter table public.nfe_conferences
  add column if not exists observation text;
