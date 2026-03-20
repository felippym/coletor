/**
 * Lê o .pfx da PROMESSA (ipanema) e grava NFE_*_IPANEMA em .env.local.
 * Senha: defina NFE_IPANEMA_PASSWORD ou passe como 2º argumento (não commite).
 *
 * PowerShell:
 *   $env:NFE_IPANEMA_PASSWORD="sua_senha"; node scripts/apply-nfe-ipanema-local.js
 *
 * Caminho padrão: Documents\PROMESSA DIVINA CUTELARIA BAZAR LTDA_04839192000185.pfx
 */
const fs = require("fs");
const path = require("path");

const defaultPfx = path.join(
  process.env.USERPROFILE || process.env.HOME || "",
  "Documents",
  "PROMESSA DIVINA CUTELARIA BAZAR LTDA_04839192000185.pfx"
);
const pfxPath = path.resolve(process.argv[2] || defaultPfx);
const password = process.env.NFE_IPANEMA_PASSWORD?.trim() || process.argv[3];
const cnpj = process.env.NFE_CNPJ_IPANEMA?.trim() || "04839192000185";

if (!password) {
  console.error(
    "Defina NFE_IPANEMA_PASSWORD ou: node scripts/apply-nfe-ipanema-local.js [caminho.pfx] <senha>"
  );
  process.exit(1);
}
if (!fs.existsSync(pfxPath)) {
  console.error("Arquivo .pfx não encontrado:", pfxPath);
  process.exit(1);
}

const base64 = fs.readFileSync(pfxPath).toString("base64").replace(/\s/g, "");
const root = path.join(__dirname, "..");
const envLocal = path.join(root, ".env.local");

const block = [
  "# NFe — ipanema (PROMESSA) — gerado por scripts/apply-nfe-ipanema-local.js",
  `NFE_CERT_BASE64_IPANEMA=${base64}`,
  `NFE_CERT_PASSWORD_IPANEMA=${password}`,
  `NFE_CNPJ_IPANEMA=${cnpj}`,
].join("\n");

let existing = fs.existsSync(envLocal) ? fs.readFileSync(envLocal, "utf8") : "";
const stripped = existing
  .split(/\r?\n/)
  .filter(
    (line) =>
      !/^\s*#\s*NFe — ipanema/.test(line) &&
      !/^\s*NFE_(CERT_BASE64_IPANEMA|CERT_PASSWORD_IPANEMA|CNPJ_IPANEMA)=/.test(line)
  )
  .join("\n")
  .trim();

const next = [stripped, stripped ? "" : null, block].filter(Boolean).join("\n") + "\n";
fs.writeFileSync(envLocal, next, "utf8");
console.log("OK:", envLocal, "(variáveis NFE_*_IPANEMA atualizadas)");
