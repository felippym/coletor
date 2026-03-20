/**
 * Executa supabase/migrations/018_inventories_funcionario.sql
 */
require("dotenv").config({ path: require("path").join(process.cwd(), ".env.local") });
const fs = require("fs");
const path = require("path");

async function main() {
  const sql = fs.readFileSync(
    path.join(process.cwd(), "supabase", "migrations", "018_inventories_funcionario.sql"),
    "utf-8",
  );
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log(`
Defina DATABASE_URL no .env.local ou rode o SQL em supabase/migrations/018_inventories_funcionario.sql no Supabase SQL Editor.
`);
    process.exit(1);
  }
  try {
    const { default: pg } = await import("pg");
    const client = new pg.Client({ connectionString: url });
    await client.connect();
    await client.query(sql);
    await client.end();
    console.log("Migração 018 (inventories.funcionario) executada com sucesso.");
  } catch (err) {
    console.error("Erro:", err.message);
    process.exit(1);
  }
}

main();
