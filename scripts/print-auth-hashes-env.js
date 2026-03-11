/**
 * Imprime o valor de AUTH_HASHES_JSON para configurar na Vercel.
 * Execute após gerar auth-hashes.json (node scripts/generate-auth-hashes.js)
 *
 *   node scripts/print-auth-hashes-env.js
 *
 * Copie a saída e adicione em Vercel > Project > Settings > Environment Variables
 */

const fs = require("fs");
const path = require("path");

const filePath = path.join(process.cwd(), "auth-hashes.json");
if (!fs.existsSync(filePath)) {
  console.error("Execute primeiro: node scripts/generate-auth-hashes.js");
  process.exit(1);
}
const json = fs.readFileSync(filePath, "utf-8");
const compact = JSON.stringify(JSON.parse(json));
console.log("\n=== AUTH_HASHES_JSON (cole na Vercel) ===\n");
console.log(compact);
console.log("\n==========================================\n");
