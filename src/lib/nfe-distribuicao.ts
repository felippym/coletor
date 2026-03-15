/**
 * Consulta NFe via Distribuição DFe (SEFAZ) com certificado digital A1.
 * Requer: NFE_CERT_BASE64, NFE_CERT_PASSWORD, NFE_CNPJ
 */

import https from "https";
import zlib from "zlib";
import { XMLParser } from "fast-xml-parser";

const DFE_URL = "https://www1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx";
const SOAP_ACTION = "http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe/nfeDistDFeInteresse";

function buildDistDFeInt(chave: string, cnpj: string, tpAmb: number): string {
  const cUFAutor = chave.substring(0, 2);
  const cnpjClean = cnpj.replace(/\D/g, "");
  const isCpf = cnpjClean.length === 11;
  const tagId = isCpf ? "CPF" : "CNPJ";
  return `<distDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01">
  <tpAmb>${tpAmb}</tpAmb>
  <cUFAutor>${cUFAutor}</cUFAutor>
  <${tagId}>${cnpjClean}</${tagId}>
  <consChNFe>
    <chNFe>${chave}</chNFe>
  </consChNFe>
</distDFeInt>`;
}

function buildSoapEnvelope(distDFeInt: string, cUFAutor: string): string {
  // nfeDadosMsg deve conter o distDFeInt como XML filho direto (não escapado).
  // Escape gera cStat 243 (XML mal formado).
  return `<?xml version="1.0" encoding="UTF-8"?>
<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope" xmlns:nfe="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe">
  <soap12:Header>
    <nfeCabecMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe">
      <cUF>${cUFAutor}</cUF>
      <versaoDados>1.01</versaoDados>
    </nfeCabecMsg>
  </soap12:Header>
  <soap12:Body>
    <nfe:nfeDistDFeInteresse>
      <nfe:nfeDadosMsg>${distDFeInt}</nfe:nfeDadosMsg>
    </nfe:nfeDistDFeInteresse>
  </soap12:Body>
</soap12:Envelope>`;
}

function decompressDocZip(base64: string): string {
  const buf = Buffer.from(base64, "base64");
  return zlib.gunzipSync(buf).toString("utf-8");
}

export async function fetchXmlByCert(chave: string): Promise<{ xml: string } | { error: string }> {
  const certBase64 = process.env.NFE_CERT_BASE64;
  const certPassword = process.env.NFE_CERT_PASSWORD;
  const cnpj = process.env.NFE_CNPJ;

  if (!certBase64 || !certPassword || !cnpj) {
    return {
      error:
        "Certificado não configurado. Defina NFE_CERT_BASE64, NFE_CERT_PASSWORD e NFE_CNPJ nas variáveis de ambiente.",
    };
  }

  let pfx: Buffer;
  try {
    pfx = Buffer.from(certBase64, "base64");
  } catch {
    return { error: "NFE_CERT_BASE64 inválido (deve ser base64 do arquivo .pfx)" };
  }

  const tpAmb = process.env.NFE_AMBIENTE === "2" ? 2 : 1;
  const cUFAutor = chave.substring(0, 2);
  const distDFeInt = buildDistDFeInt(chave, cnpj, tpAmb);
  const soapBody = buildSoapEnvelope(distDFeInt, cUFAutor);

  return new Promise((resolve) => {
    const url = new URL(DFE_URL);
    const options: https.RequestOptions = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/soap+xml; charset=utf-8",
        "Content-Length": Buffer.byteLength(soapBody, "utf-8"),
        SOAPAction: SOAP_ACTION,
      },
      pfx,
      passphrase: certPassword,
      rejectUnauthorized: true,
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_",
          });
          const parsed = parser.parse(data) as Record<string, unknown>;

          const body =
            (parsed["soap12:Envelope"] ?? parsed["soap:Envelope"]) as Record<string, unknown> | undefined;
          const envBody =
            (body?.["soap12:Body"] ?? body?.["soap:Body"]) as Record<string, unknown> | undefined;
          const result =
            (envBody?.["nfe:nfeDistDFeInteresseResponse"] ??
              envBody?.["nfeDistDFeInteresseResponse"]) as Record<string, unknown> | undefined;
          let resultContent: unknown =
            result?.["nfe:nfeDistDFeInteresseResult"] ?? result?.["nfeDistDFeInteresseResult"];

          if (typeof resultContent === "string" && resultContent.trim().startsWith("<")) {
            try {
              resultContent = parser.parse(resultContent) as Record<string, unknown>;
            } catch {
              // keep as is
            }
          }

          if (!resultContent || (typeof resultContent !== "object" && typeof resultContent !== "string")) {
            const fault = (body?.["soap:Body"] as Record<string, unknown>)?.["soap:Fault"];
            if (fault) {
              const reason = (fault as Record<string, unknown>)?.["soap:Reason"] as Record<string, unknown> | undefined;
              const text = reason?.["soap:Text"] as string | undefined;
              resolve({ error: text || "Erro SOAP na SEFAZ" });
              return;
            }
            resolve({ error: "Resposta inválida da SEFAZ" });
            return;
          }

          const findInTree = (obj: unknown, key: string): unknown => {
            if (!obj || typeof obj !== "object") return undefined;
            const o = obj as Record<string, unknown>;
            if (key in o) return o[key];
            for (const v of Object.values(o)) {
              const found = findInTree(v, key);
              if (found !== undefined) return found;
            }
            return undefined;
          };

          const cStat = String(findInTree(resultContent, "cStat") ?? "");
          const xMotivo = findInTree(resultContent, "xMotivo");

          if (cStat !== "137" && cStat !== "138") {
            resolve({
              error: `SEFAZ: ${xMotivo ?? cStat} (cStat: ${cStat}). Verifique se o CNPJ/CPF do certificado tem permissão para consultar esta NFe.`,
            });
            return;
          }

          const lote = findInTree(resultContent, "loteDistDFeInt") as Record<string, unknown> | undefined;
          const docZipRaw = lote?.docZip ?? findInTree(resultContent, "docZip");
          const docZipList = Array.isArray(docZipRaw) ? docZipRaw : docZipRaw ? [docZipRaw] : [];

          for (const dz of docZipList) {
            const dzObj = dz as Record<string, unknown> & { "#text"?: string };
            const schema = (dzObj["@_schema"] ?? dzObj["schema"]) as string | undefined;
            const content = dzObj["#text"] ?? dzObj["_"] ?? dzObj;
            if (typeof content !== "string") continue;
            const schemaStr = String(schema ?? "");
            if (!schemaStr.includes("procNFe") && !schemaStr.includes("resNFe") && !schemaStr.includes("NFe")) continue;
            try {
              const xml = decompressDocZip(content);
              if (xml.includes("<NFe") || xml.includes("<nfeProc") || xml.includes("infNFe")) {
                resolve({ xml });
                return;
              }
            } catch {
              // try next
            }
          }

          resolve({
            error:
              "NFe não retornada. Pode ser: (1) você é o emitente (emitente não recebe XML por chave), (2) nota com mais de 90 dias, (3) destinatário sem manifestação prévia.",
          });
        } catch (err) {
          console.error("[nfe-distribuicao] parse error:", err);
          resolve({ error: "Erro ao processar resposta da SEFAZ" });
        }
      });
    });

    req.on("error", (err) => {
      console.error("[nfe-distribuicao] request error:", err);
      resolve({
        error:
          err.message?.includes("certificate") || err.message?.includes("UNABLE_TO_VERIFY")
            ? "Certificado digital inválido ou expirado. Verifique NFE_CERT_BASE64 e NFE_CERT_PASSWORD."
            : `Erro de conexão: ${err.message}`,
      });
    });

    req.setTimeout(15000, () => {
      req.destroy();
      resolve({ error: "Timeout na comunicação com a SEFAZ" });
    });

    req.write(soapBody, "utf-8");
    req.end();
  });
}
