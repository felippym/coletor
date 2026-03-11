/**
 * Executa a migração 004 (coluna status nos inventários).
 * Requer DATABASE_URL no .env.local (Connection string do Supabase: Project Settings > Database)
 */
require("dotenv").config({ path: require("path").join(process.cwd(), ".env.local") });
const fs = require("fs");
const path = require("path");

async function main() {
  const sql = fs.readFileSync(
    path.join(process.cwd(), "supabase", "migrations", "004_add_inventory_status.sql"),
    "utf-8"
  );

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log(`
Migração não executada: DATABASE_URL não definida.

Para executar a migração:
1. Abra o Supabase Dashboard > Project Settings > Database
2. Copie a "Connection string" (modo URI)
3. Adicione ao .env.local:
   DATABASE_URL=postgresql://postgres.[ref]:[SENHA]@aws-0-[regiao].pooler.supabase.com:6543/postgres
4. Execute: node scripts/run-migration-status.js

Alternativa: copie o conteúdo de supabase/migrations/004_add_inventory_status.sql
e execute no Supabase SQL Editor.
`);
    process.exit(1);
  }

  try {
    const { default: pg } = await import("pg");
    const client = new pg.Client({ connectionString: url });
    await client.connect();
    await client.query(sql);
    await client.end();
    console.log("Migração executada com sucesso. Coluna 'status' adicionada.");
  } catch (err) {
    if (err.message?.includes("already exists")) {
      console.log("Coluna 'status' já existe. Nada a fazer.");
    } else {
      console.error("Erro:", err.message);
      process.exit(1);
    }
  }
}

main();
