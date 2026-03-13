/**
 * Gera AUTH_HASHES_B64 (Base64) e AUTH_HASHES_JSON para produção.
 * Use AUTH_HASHES_B64 na Vercel (evita corrupção de caracteres $ e ").
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
const b64 = Buffer.from(json, "utf-8").toString("base64");

// Grava em .env.production.local (gitignored)
const envPath = path.join(process.cwd(), ".env.production.local");
const envContent = `AUTH_HASHES_B64=${b64}\n`;
fs.writeFileSync(envPath, envContent, "utf-8");
console.log(`\n✓ AUTH_HASHES_B64 gravado em .env.production.local`);

// Imprime para copiar na Vercel
console.log("\n=== Para Vercel: use AUTH_HASHES_B64 (recomendado) ===\n");
console.log(b64);
console.log("\n=== Fim ===\n");
