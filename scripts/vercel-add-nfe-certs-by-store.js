/**
 * Envia para a Vercel (ambiente production) as variáveis NFe por loja
 * lidas do .env.local — mesmo padrão do apply-nfe-ipanema-local.js.
 *
 * Pré-requisito: `npx vercel login` e projeto linkado (`vercel link`).
 *
 * Uso:
 *   node scripts/vercel-add-nfe-certs-by-store.js
 *
 * Variáveis suportadas (só as que existirem no .env.local):
 *   NFE_CERT_BASE64_IPANEMA, NFE_CERT_PASSWORD_IPANEMA, NFE_CNPJ_IPANEMA
 *   NFE_CERT_BASE64_LEBLON, NFE_CERT_PASSWORD_LEBLON, NFE_CNPJ_LEBLON
 *   NFE_AMBIENTE (opcional)
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const KEYS = [
  "NFE_CERT_BASE64_IPANEMA",
  "NFE_CERT_PASSWORD_IPANEMA",
  "NFE_CNPJ_IPANEMA",
  "NFE_CERT_BASE64_LEBLON",
  "NFE_CERT_PASSWORD_LEBLON",
  "NFE_CNPJ_LEBLON",
  "NFE_AMBIENTE",
];

function parseEnvLocal(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error("Arquivo não encontrado:", filePath);
    process.exit(1);
  }
  const raw = fs.readFileSync(filePath, "utf8");
  const out = new Map();
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (KEYS.includes(key)) out.set(key, val);
  }
  return out;
}

function addEnv(key, value, environment) {
  if (!value) return;
  const tmp = path.join(process.cwd(), `.vercel-env-${key}.tmp`);
  fs.writeFileSync(tmp, value, "utf8");
  try {
    execSync(`npx vercel env rm ${key} ${environment} --yes 2>nul`, { stdio: "ignore", shell: true });
  } catch {
    /* não existia */
  }
  try {
    execSync(`npx vercel env add ${key} ${environment} --yes < "${tmp}"`, {
      stdio: "inherit",
      shell: true,
    });
    console.log("OK:", key);
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
}

const envLocal = path.join(process.cwd(), ".env.local");
const vars = parseEnvLocal(envLocal);
const env = process.argv[2] || "production";

let n = 0;
for (const key of KEYS) {
  const v = vars.get(key);
  if (v) {
    addEnv(key, v, env);
    n++;
  }
}

if (n === 0) {
  console.error(
    "Nenhuma variável NFE_*_IPANEMA / NFE_*_LEBLON encontrada em .env.local. Rode antes: npm run nfe:env:ipanema"
  );
  process.exit(1);
}

console.log("\nFeito. Na Vercel: faça um novo deploy (Redeploy) para carregar as variáveis.");
