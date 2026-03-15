/**
 * Converte o arquivo .pfx do certificado digital para base64.
 * Use a saída em NFE_CERT_BASE64.
 *
 * Node: node scripts/nfe-cert-to-base64.js caminho/para/certificado.pfx
 * PowerShell: node scripts/nfe-cert-to-base64.js "C:\caminho\certificado.pfx"
 */

const fs = require("fs");
const path = require("path");

const pfxPath = process.argv[2];
if (!pfxPath) {
  console.error("Uso: node scripts/nfe-cert-to-base64.js <caminho-do-arquivo.pfx>");
  process.exit(1);
}

const fullPath = path.resolve(pfxPath);
if (!fs.existsSync(fullPath)) {
  console.error("Arquivo não encontrado:", fullPath);
  process.exit(1);
}

const pfxBuffer = fs.readFileSync(fullPath);
const base64 = pfxBuffer.toString("base64");

console.log("\n=== NFE_CERT_BASE64 (copie o valor abaixo) ===\n");
console.log(base64);
console.log("\n=== Fim ===\n");
console.log("Também defina: NFE_CERT_PASSWORD e NFE_CNPJ");
