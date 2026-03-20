import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";
import { fetchXmlByCert } from "@/lib/nfe-distribuicao";
import { VIEWER_HEADER } from "@/lib/product-review-viewer";
import type { NFeInvoice, NFeProduct } from "@/types/nfe";

/** Mapeamento UF (2 primeiros dígitos da chave) para URL base SEFAZ de consulta pública */
const UF_TO_SEFAZ_URL: Record<string, string> = {
  "11": "https://www.sefaz.rr.gov.br",
  "12": "https://www.sefaz.ac.gov.br",
  "13": "https://www.sefaz.am.gov.br",
  "14": "https://app.sefa.pa.gov.br",
  "15": "https://app.sefa.pa.gov.br",
  "16": "https://sefaz.ap.gov.br",
  "17": "https://sefaz.to.gov.br",
  "21": "https://app.sefa.ma.gov.br",
  "22": "https://sefaz.pi.gov.br",
  "23": "http://nfe.sefaz.ce.gov.br",
  "24": "https://portal.rn.gov.br",
  "25": "https://sefaz.pb.gov.br",
  "26": "https://efisco.sefaz.pe.gov.br",
  "27": "https://sefaz.al.gov.br",
  "28": "https://sefaz.se.gov.br",
  "29": "https://sefaz.ba.gov.br",
  "31": "https://nfe.fazenda.mg.gov.br",
  "32": "https://app.sefaz.es.gov.br",
  "33": "https://nfe.fazenda.rj.gov.br",
  "35": "https://nfe.fazenda.sp.gov.br",
  "41": "https://www.sefa.pr.gov.br",
  "42": "https://sat.sef.sc.gov.br",
  "43": "https://nfe.sefaz.rs.gov.br",
  "50": "https://nfe.sefaz.ms.gov.br",
  "51": "https://nfe.sefaz.mt.gov.br",
  "52": "http://nfe.sefaz.go.gov.br",
  "53": "https://www.df.gov.br",
};

function parseNFeXml(xml: string): NFeInvoice | null {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    isArray: (name) => name === "det",
  });

  let doc: Record<string, unknown>;
  try {
    doc = parser.parse(xml) as Record<string, unknown>;
  } catch {
    return null;
  }

  // Suporta nfeProc (XML com protocolo) ou NFe direto
  const nfeProc = doc.nfeProc as Record<string, unknown> | undefined;
  const nfeDirect = doc.NFe as Record<string, unknown> | undefined;
  const nfe = nfeProc?.NFe ?? nfeDirect;
  if (!nfe || typeof nfe !== "object") return null;

  const infNFe = (nfe as Record<string, unknown>).infNFe as Record<string, unknown> | undefined;
  if (!infNFe) return null;

  const ide = infNFe.ide as Record<string, unknown> | undefined;
  const emit = infNFe.emit as Record<string, unknown> | undefined;
  const dest = infNFe.dest as Record<string, unknown> | undefined;
  const detRaw = infNFe.det;

  const nNF = ide?.nNF != null ? String(ide.nNF) : "";
  const dhEmi = ide?.dhEmi != null ? String(ide.dhEmi) : "";
  const xNome = emit?.xNome != null ? String(emit.xNome) : "";
  const emitCnpj = emit?.CNPJ != null ? String(emit.CNPJ) : emit?.CPF != null ? String(emit.CPF) : "";
  const destXNome = dest?.xNome != null ? String(dest.xNome) : "";
  const destCnpj = dest?.CNPJ != null ? String(dest.CNPJ) : dest?.CPF != null ? String(dest.CPF) : "";
  const chave = (infNFe["@_Id"] as string)?.replace?.("NFe", "") ?? "";

  const detList = Array.isArray(detRaw) ? detRaw : detRaw ? [detRaw] : [];
  const products: NFeProduct[] = detList
    .map((d) => {
      const det = d as Record<string, unknown>;
      const prod = det.prod as Record<string, unknown> | undefined;
      if (!prod) return null;

      let ean = prod.cEAN != null ? String(prod.cEAN).trim() : "";
      if (!ean || ean === "SEM GTIN" || ean === "0") {
        ean = prod.cProd != null ? String(prod.cProd).trim() : "";
      }
      const description = prod.xProd != null ? String(prod.xProd).trim() : "";
      const qCom = prod.qCom != null ? parseFloat(String(prod.qCom)) : 0;
      const vUnCom = prod.vUnCom != null ? parseFloat(String(prod.vUnCom)) : 0;

      if (!ean && !description) return null;

      return {
        ean: ean || `item-${det["@_nItem"] ?? "?"}`,
        description: description || "Produto sem descrição",
        expectedQty: Math.round(qCom * 1000) / 1000,
        unitPrice: Math.round(vUnCom * 100) / 100,
        countedQty: 0,
      };
    })
    .filter((p): p is NFeProduct => p != null);

  return {
    key: chave,
    invoiceNumber: nNF,
    supplierName: xNome,
    supplierCnpj: emitCnpj || undefined,
    issueDate: dhEmi,
    products,
    destRazaoSocial: destXNome || undefined,
    destCnpj: destCnpj || undefined,
  };
}

async function fetchXmlByChave(chave: string): Promise<string | null> {
  const uf = chave.substring(0, 2);
  const baseUrl = UF_TO_SEFAZ_URL[uf];
  if (!baseUrl) return null;

  // A maioria dos portais SEFAZ exige certificado digital ou CAPTCHA.
  // Tentamos URLs comuns de consulta; se falhar, o usuário deve colar o XML.
  const urlsToTry = [
    `${baseUrl}/nfce/web/modules/consultaConsumidor/consultaPublica.jsf`,
    `${baseUrl}/nfeweb/sites/nfe/consulta-publica/principal`,
    `${baseUrl}/portal/consultaPublica/consultaPublica.jsf`,
  ];

  for (const url of urlsToTry) {
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "text/html,application/xhtml+xml" },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const html = await res.text();
        // Portais SEFAZ geralmente não retornam XML direto via GET simples.
        // Retornamos null para indicar que o usuário deve colar o XML.
        if (html.includes("chave") || html.includes("chaveNFe")) {
          return null; // Página de formulário, não XML
        }
      }
    } catch {
      // ignore
    }
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let body: { chave?: string; xml?: string; viewerUser?: string } = {};

    if (contentType.includes("application/json")) {
      body = (await request.json()) as { chave?: string; xml?: string; viewerUser?: string };
    } else if (contentType.includes("text/plain") || contentType.includes("application/xml") || contentType.includes("text/xml")) {
      const xml = await request.text();
      body = { xml };
    }

    const { chave, xml } = body;
    const viewerUser =
      typeof body.viewerUser === "string" && body.viewerUser.trim()
        ? body.viewerUser.trim()
        : request.headers.get(VIEWER_HEADER);
    const chaveClean = typeof chave === "string" ? chave.replace(/\D/g, "") : "";
    const xmlTrimmed = typeof xml === "string" ? xml.trim() : "";

    if (xmlTrimmed) {
      const invoice = parseNFeXml(xmlTrimmed);
      if (!invoice) {
        return NextResponse.json(
          { error: "Não foi possível extrair dados do XML. Verifique se é um XML de NFe válido." },
          { status: 400 }
        );
      }
      return NextResponse.json(invoice);
    }

    if (chaveClean.length === 44) {
      const certResult = await fetchXmlByCert(chaveClean, viewerUser);
      if ("xml" in certResult) {
        const invoice = parseNFeXml(certResult.xml);
        if (invoice) return NextResponse.json(invoice);
      }
      if ("error" in certResult) {
        const msg = certResult.error;
        if (
          !msg.includes("não configurado") &&
          !msg.includes("Certificado não configurado") &&
          !msg.includes("não configurado no servidor")
        ) {
          return NextResponse.json({ error: msg }, { status: 400 });
        }
      }
      const fetchedXml = await fetchXmlByChave(chaveClean);
      if (fetchedXml) {
        const invoice = parseNFeXml(fetchedXml);
        if (invoice) return NextResponse.json(invoice);
      }
      return NextResponse.json(
        {
          error:
            "Não foi possível obter o XML pela chave. Login leblon ou ipanema com certificado configurado no servidor (veja .env.example), ou cole o XML da NFe.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Informe a chave de 44 dígitos ou o XML da NFe." },
      { status: 400 }
    );
  } catch (err) {
    console.error("[nfe/consult]", err);
    return NextResponse.json({ error: "Erro ao processar a solicitação." }, { status: 500 });
  }
}
