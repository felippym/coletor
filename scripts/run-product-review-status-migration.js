/**
 * Executa supabase/migrations/015_product_review_ticket_status.sql
 * Requer DATABASE_URL no .env.local
 */
require("dotenv").config({ path: require("path").join(process.cwd(), ".env.local") });
const fs = require("fs");
const path = require("path");

async function main() {
  const sql = fs.readFileSync(
    path.join(process.cwd(), "supabase", "migrations", "015_product_review_ticket_status.sql"),
    "utf-8"
  );

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log("Defina DATABASE_URL no .env.local ou rode o SQL no Supabase SQL Editor.");
    process.exit(1);
  }

  try {
    const { default: pg } = await import("pg");
    const client = new pg.Client({ connectionString: url });
    await client.connect();
    await client.query(sql);
    await client.end();
    console.log("Migração 015 (status em product_review_tickets) executada com sucesso.");
  } catch (err) {
    console.error("Erro:", err.message);
    process.exit(1);
  }
}

main();
