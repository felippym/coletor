/**
 * Executa a migração 009 (colunas dest_razao_social, dest_cnpj, supplier_cnpj em nfe_conferences).
 * Requer DATABASE_URL no .env.local (Connection string do Supabase: Project Settings > Database)
 */
require("dotenv").config({ path: require("path").join(process.cwd(), ".env.local") });
const fs = require("fs");
const path = require("path");

async function main() {
  const sql = fs.readFileSync(
    path.join(process.cwd(), "supabase", "migrations", "009_add_nfe_dest_supplier_cnpj.sql"),
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
4. Execute: node scripts/run-nfe-migration.js

Alternativa: execute supabase/RUN_THIS_TO_FIX_NFE.sql no Supabase SQL Editor.
`);
    process.exit(1);
  }

  try {
    const { default: pg } = await import("pg");
    const client = new pg.Client({ connectionString: url });
    await client.connect();
    await client.query(sql);
    await client.end();
    console.log("Migração executada com sucesso. Colunas dest_razao_social, dest_cnpj, supplier_cnpj adicionadas.");
  } catch (err) {
    console.error("Erro:", err.message);
    process.exit(1);
  }
}

main();
