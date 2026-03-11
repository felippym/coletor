/**
 * Configura AUTH_HASHES_JSON na Vercel via CLI.
 *
 * 1. Faça login: npx vercel login
 * 2. Execute: node scripts/setup-vercel-auth.js
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const filePath = path.join(process.cwd(), "auth-hashes.json");
if (!fs.existsSync(filePath)) {
  console.error("Execute primeiro: node scripts/generate-auth-hashes.js");
  process.exit(1);
}

const json = fs.readFileSync(filePath, "utf-8");
const value = JSON.stringify(JSON.parse(json));

console.log("Adicionando AUTH_HASHES_JSON na Vercel (production)...");
try {
  execSync(
    `npx vercel env add AUTH_HASHES_JSON production --value ${JSON.stringify(value)} --yes --force`,
    { stdio: "inherit", shell: true }
  );
  console.log("\n✓ Variável adicionada. Faça Redeploy no dashboard da Vercel.");
} catch (e) {
  console.error("\nFalha. Certifique-se de ter feito: npx vercel login");
  console.error("\nOu adicione manualmente em Vercel > Settings > Environment Variables:");
  console.error("Name: AUTH_HASHES_JSON");
  console.error("Value:", value);
}
