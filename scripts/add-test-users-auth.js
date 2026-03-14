/**
 * Adiciona Kelly e Joana ao auth-hashes.json para teste local.
 * Senha para ambos: teste123
 * Execute: node scripts/add-test-users-auth.js
 */

const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

const TEST_USERS = [
  { key: "kelly", password: "teste123" },
  { key: "joana", password: "teste123" },
];

async function main() {
  const outPath = path.join(process.cwd(), "auth-hashes.json");
  let hashes = {};

  try {
    const existing = fs.readFileSync(outPath, "utf-8");
    hashes = JSON.parse(existing);
  } catch {
    console.log("auth-hashes.json não encontrado, criando novo...");
  }

  for (const { key, password } of TEST_USERS) {
    hashes[key] = await bcrypt.hash(password, 10);
    console.log(`Adicionado: ${key} (senha: ${password})`);
  }

  fs.writeFileSync(outPath, JSON.stringify(hashes, null, 2), "utf-8");
  console.log(`\nauth-hashes.json atualizado em ${outPath}`);
  console.log("\nCredenciais para teste local:");
  console.log("  Kelly (Loja Leblon)  - usuário: kelly  | senha: teste123");
  console.log("  Joana (Loja Ipanema) - usuário: joana  | senha: teste123");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
