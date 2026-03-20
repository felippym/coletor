/**
 * Importa a planilha fiscal (xlsx) para a tabela public.fiscal_regras no Supabase.
 *
 * Pré-requisito: executar supabase/migrations/013_create_fiscal_regras.sql no projeto.
 *
 * Uso:
 *   node scripts/seed-fiscal-supabase.js [caminho-do-xlsx]
 * Padrão: data/fiscal/planilha_final_com_regras.xlsx
 */

require("dotenv").config({ path: require("path").join(process.cwd(), ".env.local") });
const XLSX = require("xlsx");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local"
  );
  process.exit(1);
}

const BATCH_SIZE = 400;

function buildSearchText(row) {
  return Object.values(row)
    .map((v) => String(v ?? "").toLowerCase())
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  const xlsxPath =
    process.argv[2] ||
    path.join(process.cwd(), "data", "fiscal", "planilha_final_com_regras.xlsx");

  console.log("Lendo:", xlsxPath);

  const wb = XLSX.readFile(xlsxPath);
  const name = wb.SheetNames[0];
  if (!name) {
    console.error("Planilha sem abas.");
    process.exit(1);
  }
  const sheet = wb.Sheets[name];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });

  const payload = rows.map((row) => ({
    row_data: row,
    search_text: buildSearchText(row),
  }));

  console.log(`Total de linhas: ${payload.length}`);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  console.log("Limpando tabela fiscal_regras…");
  const { error: delErr } = await supabase.from("fiscal_regras").delete().neq("id", 0);
  if (delErr) {
    console.error("Erro ao limpar tabela:", delErr.message);
    process.exit(1);
  }

  let inserted = 0;
  for (let i = 0; i < payload.length; i += BATCH_SIZE) {
    const batch = payload.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("fiscal_regras").insert(batch);
    if (error) {
      console.error(`Erro no batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message);
      process.exit(1);
    }
    inserted += batch.length;
    process.stdout.write(`\rInseridos: ${inserted}/${payload.length}`);
  }

  console.log("\nConcluído. Reinicie o servidor Next.js se a consulta fiscal estava em cache.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
