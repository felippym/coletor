/**
 * Executa supabase/migrations/013_create_fiscal_regras.sql
 * Requer DATABASE_URL no .env.local (connection string do Postgres do Supabase).
 */
require("dotenv").config({ path: require("path").join(process.cwd(), ".env.local") });
const fs = require("fs");
const path = require("path");

async function main() {
  const sql = fs.readFileSync(
    path.join(process.cwd(), "supabase", "migrations", "013_create_fiscal_regras.sql"),
    "utf-8"
  );

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log(`
Defina DATABASE_URL no .env.local (URI do Postgres em Project Settings > Database),
ou copie o conteúdo de supabase/migrations/013_create_fiscal_regras.sql
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
    console.log("Migração 013 (fiscal_regras) executada com sucesso.");
  } catch (err) {
    if (
      err.message?.includes("already exists") ||
      err.message?.includes("duplicate key")
    ) {
      console.log("Objetos já existentes ou migração parcial — verifique o SQL Editor.");
    } else {
      console.error("Erro:", err.message);
      process.exit(1);
    }
  }
}

main();
