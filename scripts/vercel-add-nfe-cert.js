/**
 * Legado: NFE_CERT_BASE64 único. Preferir: npm run nfe:vercel:env (NFE_*_IPANEMA / LEBLON).
 * Uso: node scripts/vercel-add-nfe-cert.js
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const envPath = path.join(process.cwd(), ".env.local");
const content = fs.readFileSync(envPath, "utf-8");
const match = content.match(/NFE_CERT_BASE64=(.+)/);
if (!match) {
  console.error("NFE_CERT_BASE64 não encontrado em .env.local");
  process.exit(1);
}

const value = match[1].trim();
const tmpFile = path.join(process.cwd(), ".nfe-cert-tmp.txt");
fs.writeFileSync(tmpFile, value, "utf-8");

try {
  execSync(`npx vercel env add NFE_CERT_BASE64 production --yes < "${tmpFile}"`, {
    stdio: "inherit",
    shell: true,
  });
  console.log("NFE_CERT_BASE64 adicionado à Vercel.");
} finally {
  try {
    fs.unlinkSync(tmpFile);
  } catch {}
}
