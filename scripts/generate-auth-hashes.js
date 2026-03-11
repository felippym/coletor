/**
 * Gera auth-hashes.json com os hashes bcrypt das senhas.
 * Execute com as senhas em variáveis de ambiente.
 *
 * Windows (PowerShell):
 *   $env:AUTH_ADMIN_PASS="sua_senha_admin"
 *   $env:AUTH_LEBLON_PASS="sua_senha_leblon"
 *   $env:AUTH_IPANEMA_PASS="sua_senha_ipanema"
 *   node scripts/generate-auth-hashes.js
 *
 * Linux/Mac:
 *   AUTH_ADMIN_PASS=xxx AUTH_LEBLON_PASS=xxx AUTH_IPANEMA_PASS=xxx node scripts/generate-auth-hashes.js
 */

const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

const USERS = [
  { key: "admin", env: "AUTH_ADMIN_PASS" },
  { key: "leblon", env: "AUTH_LEBLON_PASS" },
  { key: "ipanema", env: "AUTH_IPANEMA_PASS" },
];

async function main() {
  const result = {};
  for (const { key, env } of USERS) {
    const pass = process.env[env];
    if (!pass) {
      console.error(`Erro: variável ${env} não definida. Defina as senhas antes de executar.`);
      process.exit(1);
    }
    result[key] = await bcrypt.hash(pass, 10);
  }
  const outPath = path.join(process.cwd(), "auth-hashes.json");
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), "utf-8");
  console.log(`auth-hashes.json criado em ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
