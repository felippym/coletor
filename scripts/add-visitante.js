/**
 * Adiciona o usuário visitante (senha: visitante123) ao auth-hashes.json.
 * Execute: node scripts/add-visitante.js
 */

const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

async function main() {
  const hash = await bcrypt.hash("visitante123", 10);
  const outPath = path.join(process.cwd(), "auth-hashes.json");

  let data = {};
  if (fs.existsSync(outPath)) {
    data = JSON.parse(fs.readFileSync(outPath, "utf-8"));
  }

  data.visitante = hash;
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2), "utf-8");
  console.log("Usuário visitante adicionado ao auth-hashes.json");
  console.log("Login: visitante | Senha: visitante123");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
