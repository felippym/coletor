-- Adiciona coluna started_by em conferências NFe (nome do funcionário que iniciou)
alter table public.nfe_conferences
  add column if not exists started_by text;
