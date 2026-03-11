# Configurar Supabase

Para que os dados sejam salvos no Supabase (e não apenas no localStorage) e o login valide usuários no Supabase, execute os passos abaixo.

## 1. Executar as migrations no Supabase

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **SQL Editor** → **New query**
4. Execute primeiro `supabase/migrations/001_create_inventories.sql`:

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

5. Execute em seguida `supabase/migrations/002_create_users.sql`:

```sql
-- Tabela de usuários para autenticação
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_users_username on public.users (lower(username));

alter table public.users enable row level security;
```

6. Execute `supabase/migrations/004_add_inventory_status.sql` (coluna status):

```sql
alter table public.inventories
  add column if not exists status text not null default 'em_contagem';
```

7. Clique em **Run** em cada query

## 2. Verificar variáveis de ambiente

Confirme que o `.env.local` contém:

```
NEXT_PUBLIC_SUPABASE_URL=https://jkgrxdscxznnbsodllmd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role
```

A **Service Role Key** está em **Settings** → **API** no dashboard do Supabase. **Não exponha essa chave no frontend** — ela só deve ser usada no servidor (API routes).

## 3. Cadastrar usuários no Supabase

Para criar usuários no banco, use o script que gera o SQL:

```bash
# Windows (PowerShell)
$env:AUTH_ADMIN_PASS="sua_senha_admin"
$env:AUTH_LEBLON_PASS="sua_senha_leblon"
$env:AUTH_IPANEMA_PASS="sua_senha_ipanema"
node scripts/seed-supabase-users.js

# Linux/Mac
AUTH_ADMIN_PASS=xxx AUTH_LEBLON_PASS=xxx AUTH_IPANEMA_PASS=xxx node scripts/seed-supabase-users.js
```

Cole o SQL gerado no **SQL Editor** do Supabase e execute.

## 4. Reiniciar o servidor

Após executar as migrations e configurar o `.env.local`, reinicie o `npm run dev`.

## 5. Verificar no Supabase

- **Inventários:** Table Editor → **inventories** — os dados aparecem após criar um inventário no app
- **Usuários:** Table Editor → **users** — os usuários cadastrados aparecem após rodar o script

## Fallback (auth-hashes.json)

Se `SUPABASE_SERVICE_ROLE_KEY` não estiver configurado, o login continua usando `auth-hashes.json` (legado).

## Debug

Se ainda usar localStorage, abra o Console do navegador (F12) e procure por mensagens `[Supabase]` que indicam o erro.
