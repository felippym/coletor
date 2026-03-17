-- Adiciona campos de destinatário e CNPJ do emissor (extraídos do XML da NFe)
alter table public.nfe_conferences
  add column if not exists dest_razao_social text,
  add column if not exists dest_cnpj text,
  add column if not exists supplier_cnpj text;
