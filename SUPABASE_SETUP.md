# Configurar Supabase

Para que os dados sejam salvos no Supabase (e não apenas no localStorage), execute os passos abaixo.

## 1. Executar a migration no Supabase

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **SQL Editor** → **New query**
4. Cole e execute o conteúdo do arquivo `supabase/migrations/001_create_inventories.sql`:

```sql
-- Tabela de inventários
create table if not exists public.inventories (
  id uuid primary key,
  name text not null,
  created_at timestamptz not null default now(),
  items jsonb not null default '[]'::jsonb
);

alter table public.inventories enable row level security;

drop policy if exists "Allow all for inventories" on public.inventories;
create policy "Allow all for inventories"
  on public.inventories for all to anon
  using (true) with check (true);

drop policy if exists "Allow authenticated for inventories" on public.inventories;
create policy "Allow authenticated for inventories"
  on public.inventories for all to authenticated
  using (true) with check (true);
```

5. Clique em **Run**

## 2. Verificar variáveis de ambiente

Confirme que o `.env.local` contém:

```
NEXT_PUBLIC_SUPABASE_URL=https://jkgrxdscxznnbsodllmd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
```

## 3. Reiniciar o servidor

Após executar a migration, reinicie o `npm run dev`.

## 4. Verificar no Supabase

Após criar um inventário no app, verifique em **Table Editor** → **inventories** se os dados aparecem.

## Debug

Se ainda usar localStorage, abra o Console do navegador (F12) e procure por mensagens `[Supabase]` que indicam o erro.
