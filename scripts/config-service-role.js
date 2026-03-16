#!/usr/bin/env node
/**
 * Configura SUPABASE_SERVICE_ROLE_KEY no .env.local
 * Abre o Supabase Dashboard para você copiar a chave.
 */
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const PROJECT_REF = "jkgrxdscxznnbsodllmd";
const DASHBOARD_URL = `https://supabase.com/dashboard/project/${PROJECT_REF}/settings/api`;
const ENV_PATH = path.join(__dirname, "..", ".env.local");

function openUrl(url) {
  const start = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  require("child_process").exec(`${start} "${url}"`);
}

function updateEnvFile(key) {
  if (!fs.existsSync(ENV_PATH)) {
    console.error(".env.local não encontrado.");
    process.exit(1);
  }
  let content = fs.readFileSync(ENV_PATH, "utf8");
  if (/SUPABASE_SERVICE_ROLE_KEY=/.test(content)) {
    content = content.replace(/SUPABASE_SERVICE_ROLE_KEY=.*/, `SUPABASE_SERVICE_ROLE_KEY=${key.trim()}`);
  } else {
    content += `\nSUPABASE_SERVICE_ROLE_KEY=${key.trim()}\n`;
  }
  fs.writeFileSync(ENV_PATH, content);
  console.log("\n✓ Chave salva em .env.local");
  console.log("  Reinicie o servidor (npm run dev) para aplicar.");
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

console.log("\n=== Configurar Service Role Key ===\n");
console.log("1. Abrindo Supabase Dashboard...");
openUrl(DASHBOARD_URL);
console.log("2. Na página, copie a chave 'service_role' (secret)\n");

rl.question("Cole a chave aqui e pressione Enter: ", (key) => {
  rl.close();
  if (!key || !key.trim()) {
    console.log("Nenhuma chave informada. Nada alterado.");
    process.exit(0);
  }
  updateEnvFile(key);
});
