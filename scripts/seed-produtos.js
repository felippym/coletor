/**
 * Importa produtos do Excel para o Supabase.
 * Uso: node scripts/seed-produtos.js [caminho-do-xlsx]
 * Padrão: c:\Users\felippy\Downloads\produtos_limpo.xlsx
 */

require("dotenv").config({ path: ".env.local" });
const XLSX = require("xlsx");
const path = require("path");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local");
  process.exit(1);
}

const BATCH_SIZE = 100;

function toNum(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = parseFloat(String(v).replace(",", "."));
  return isNaN(n) ? null : n;
}

async function main() {
  const xlsxPath = process.argv[2] || path.join(process.env.USERPROFILE || "", "Downloads", "produtos_limpo.xlsx");
  console.log("Lendo:", xlsxPath);

  const wb = XLSX.readFile(xlsxPath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws);

  const produtos = rows.map((r) => ({
    codigo: r["Código"] != null ? String(r["Código"]) : null,
    produto: r["Produto"] != null ? String(r["Produto"]) : null,
    cus_repos: toNum(r["Cus.Repos"]),
    pr_venda: toNum(r["Pr. Venda"]),
    pr_min: toNum(r["Pr. Min"]),
    qt_estoque: toNum(r["Qt Estoque"]),
  }));

  console.log(`Total de produtos: ${produtos.length}`);

  let inserted = 0;
  for (let i = 0; i < produtos.length; i += BATCH_SIZE) {
    const batch = produtos.slice(i, i + BATCH_SIZE);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/produtos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify(batch),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`Erro no batch ${i / BATCH_SIZE + 1}:`, res.status, err);
      process.exit(1);
    }

    inserted += batch.length;
    process.stdout.write(`\rInseridos: ${inserted}/${produtos.length}`);
  }

  console.log("\nConcluído.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
