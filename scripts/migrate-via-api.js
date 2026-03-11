/**
 * Executa migração 004 via Supabase Management API.
 * Requer SUPABASE_ACCESS_TOKEN no .env.local (Personal Access Token do Supabase)
 * Gere em: https://supabase.com/dashboard/account/tokens
 */
require("dotenv").config({ path: require("path").join(process.cwd(), ".env.local") });

const PROJECT_REF = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([a-z]+)\.supabase\.co/)?.[1];
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const SQL = `alter table public.inventories add column if not exists status text not null default 'em_contagem';`;

async function main() {
  if (!PROJECT_REF) {
    console.log("NEXT_PUBLIC_SUPABASE_URL não encontrada ou inválida.");
    process.exit(1);
  }
  if (!TOKEN) {
    console.log(`
SUPABASE_ACCESS_TOKEN não definida.

Para executar a migração via API:
1. Acesse https://supabase.com/dashboard/account/tokens
2. Crie um Personal Access Token (com escopo database:write)
3. Adicione ao .env.local: SUPABASE_ACCESS_TOKEN=seu_token
4. Execute: node scripts/migrate-via-api.js

Alternativa: execute o SQL manualmente no Supabase SQL Editor:
${SQL}
`);
    process.exit(1);
  }

  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({ query: SQL }),
  });

  const text = await res.text();
  if (res.ok) {
    console.log("Migração executada com sucesso.");
    return;
  }
  if (text.includes("already exists") || res.status === 201) {
    console.log("Coluna status já existe. Nada a fazer.");
    return;
  }
  console.error("Erro:", res.status, text);
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
