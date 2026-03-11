-- Adiciona coluna status aos inventários
-- Valores: em_contagem, finalizado, importado
-- Execute no Supabase SQL Editor se usar banco de dados
alter table public.inventories
  add column if not exists status text not null default 'em_contagem';
