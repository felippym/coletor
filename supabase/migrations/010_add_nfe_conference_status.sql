-- Adiciona coluna status às conferências NFe (override manual pelo admin)
alter table public.nfe_conferences
  add column if not exists status text;
