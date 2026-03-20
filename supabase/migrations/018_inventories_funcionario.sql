-- Funcionário que está realizando o inventário (vínculo com cadastro em funcionarios).

alter table public.inventories
  add column if not exists funcionario text;

comment on column public.inventories.funcionario is 'Nome do funcionário selecionado ao iniciar o inventário.';
