/**
 * Executa supabase/migrations/017_funcionarios_responsavel.sql
 */
require("dotenv").config({ path: require("path").join(process.cwd(), ".env.local") });
const fs = require("fs");
const path = require("path");

async function main() {
  const sql = fs.readFileSync(
    path.join(process.cwd(), "supabase", "migrations", "017_funcionarios_responsavel.sql"),
    "utf-8",
  );
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log(`
Defina DATABASE_URL no .env.local ou execute o SQL em supabase/migrations/017_funcionarios_responsavel.sql no Supabase SQL Editor.
`);
    process.exit(1);
  }
  try {
    const { default: pg } = await import("pg");
    const client = new pg.Client({ connectionString: url });
    await client.connect();
    await client.query(sql);
    await client.end();
    console.log("Migração 017 (funcionarios.responsavel) executada com sucesso.");
  } catch (err) {
    if (
      err.message?.includes("already exists") ||
      err.message?.includes("duplicate key")
    ) {
      console.log("Objetos já existentes — verifique o SQL Editor.");
    } else {
      console.error("Erro:", err.message);
      process.exit(1);
    }
  }
}

main();
