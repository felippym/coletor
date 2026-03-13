/**
 * Imprime o valor de AUTH_HASHES_JSON para usar em produção (Vercel, etc).
 * Também grava em .env.production.local para uso local.
 * Execute: node scripts/print-auth-hashes-env.js
 */

const fs = require("fs");
const path = require("path");

const filePath = path.join(process.cwd(), "auth-hashes.json");

if (!fs.existsSync(filePath)) {
  console.error("auth-hashes.json não encontrado. Execute primeiro: node scripts/add-visitante.js");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
const json = JSON.stringify(data);

// Grava em .env.production.local (gitignored)
const envPath = path.join(process.cwd(), ".env.production.local");
const envLine = `AUTH_HASHES_JSON=${json}`;
fs.writeFileSync(envPath, envLine + "\n", "utf-8");
console.log(`\n✓ AUTH_HASHES_JSON gravado em .env.production.local`);

// Também imprime para copiar manualmente na Vercel
console.log("\n=== Para Vercel: copie o valor abaixo em Settings > Environment Variables ===\n");
console.log(json);
console.log("\n=== Fim ===\n");
