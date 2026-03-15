/**
 * Extrai o CNPJ/CPF do certificado .pfx
 * Uso: node scripts/nfe-extract-cnpj.js caminho.pfx senha
 */

const fs = require("fs");
const path = require("path");

const pfxPath = process.argv[2];
const passphrase = process.argv[3];

if (!pfxPath || !passphrase) {
  console.error("Uso: node scripts/nfe-extract-cnpj.js <arquivo.pfx> <senha>");
  process.exit(1);
}

const pfxBuffer = fs.readFileSync(path.resolve(pfxPath));
const pfx = pfxBuffer.toString("binary");
try {
  const forge = require("node-forge");
  const p12Asn1 = forge.asn1.fromDer(pfx);
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, passphrase);
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const certBag = certBags[forge.pki.oids.certBag]?.[0];
  if (certBag?.cert) {
    const cert = certBag.cert;
    const subject = cert.subject.attributes;
    const cn = subject.find((a) => a.shortName === "CN")?.value ?? "";
    const oid = subject.find((a) => a.type === "2.16.76.1.3.1")?.value; // OID CNPJ
    const cnpjMatch = cn.match(/\d{14}/) ?? cn.match(/\d{11}/);
    const cnpj = cnpjMatch?.[0] ?? oid ?? "";
    console.log("CNPJ/CPF extraído:", cnpj || "(não encontrado no certificado)");
    console.log("Subject CN:", cn);
  }
} catch (e) {
  console.log("Instale node-forge para extrair: npm install node-forge");
  console.log("Ou informe o NFE_CNPJ manualmente (CNPJ ou CPF do titular do certificado)");
}
