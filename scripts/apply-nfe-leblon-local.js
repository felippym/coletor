/**
 * Lê o .pfx da PROVISAO (leblon) e grava NFE_*_LEBLON em .env.local.
 * Senha: defina NFE_LEBLON_PASSWORD ou passe como 3º argumento (não commite).
 *
 * PowerShell:
 *   $env:NFE_LEBLON_PASSWORD="sua_senha"; node scripts/apply-nfe-leblon-local.js
 *
 * Caminho padrão: Documents\PROVISAO DIVINA CUTELARIA BAZAR LTDA_23964568000128.pfx
 */
const fs = require("fs");
const path = require("path");

const defaultPfx = path.join(
  process.env.USERPROFILE || process.env.HOME || "",
  "Documents",
  "PROVISAO DIVINA CUTELARIA BAZAR LTDA_23964568000128.pfx"
);
const pfxPath = path.resolve(process.argv[2] || defaultPfx);
const password = process.env.NFE_LEBLON_PASSWORD?.trim() || process.argv[3];
const cnpj = process.env.NFE_CNPJ_LEBLON?.trim() || "23964568000128";

if (!password) {
  console.error(
    "Defina NFE_LEBLON_PASSWORD ou: node scripts/apply-nfe-leblon-local.js [caminho.pfx] <senha>"
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
  "# NFe — leblon (PROVISAO) — gerado por scripts/apply-nfe-leblon-local.js",
  `NFE_CERT_BASE64_LEBLON=${base64}`,
  `NFE_CERT_PASSWORD_LEBLON=${password}`,
  `NFE_CNPJ_LEBLON=${cnpj}`,
].join("\n");

let existing = fs.existsSync(envLocal) ? fs.readFileSync(envLocal, "utf8") : "";
const stripped = existing
  .split(/\r?\n/)
  .filter(
    (line) =>
      !/^\s*#\s*NFe — leblon/.test(line) &&
      !/^\s*NFE_(CERT_BASE64_LEBLON|CERT_PASSWORD_LEBLON|CNPJ_LEBLON)=/.test(line)
  )
  .join("\n")
  .trim();

const next = [stripped, stripped ? "" : null, block].filter(Boolean).join("\n") + "\n";
fs.writeFileSync(envLocal, next, "utf8");
console.log("OK:", envLocal, "(variáveis NFE_*_LEBLON atualizadas)");
