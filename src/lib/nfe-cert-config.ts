import { normalizeViewerUser } from "@/lib/product-review-viewer";

export type NfeCertCredentials = {
  certBase64: string;
  certPassword: string;
  cnpj: string;
};

type Resolved = { ok: true; credentials: NfeCertCredentials } | { ok: false; error: string };

/**
 * Certificado A1 por login da loja (consulta NFe por chave na SEFAZ).
 * - ipanema → PROMESSA (NFE_*_IPANEMA)
 * - leblon → PROVISAO (NFE_*_LEBLON)
 * Admin não usa certificado de loja neste fluxo (evita cruzar CNPJs).
 */
export function resolveNfeCertForViewer(rawViewer: string | null | undefined): Resolved {
  const viewer = normalizeViewerUser(rawViewer);

  if (viewer === "admin") {
    return {
      ok: false,
      error:
        "A consulta pela chave usa o certificado da loja. Faça login com leblon (PROVISAO) ou ipanema (PROMESSA), ou importe pela aba XML.",
    };
  }

  if (viewer === "ipanema") {
    const certBase64 = process.env.NFE_CERT_BASE64_IPANEMA?.trim();
    const certPassword = process.env.NFE_CERT_PASSWORD_IPANEMA?.trim();
    const cnpj = process.env.NFE_CNPJ_IPANEMA?.trim();
    if (!certBase64 || !certPassword || !cnpj) {
      return {
        ok: false,
        error:
          "Certificado PROMESSA (ipanema) não configurado no servidor. Defina NFE_CERT_BASE64_IPANEMA, NFE_CERT_PASSWORD_IPANEMA e NFE_CNPJ_IPANEMA.",
      };
    }
    return { ok: true, credentials: { certBase64, certPassword, cnpj } };
  }

  if (viewer === "leblon") {
    const certBase64 = process.env.NFE_CERT_BASE64_LEBLON?.trim();
    const certPassword = process.env.NFE_CERT_PASSWORD_LEBLON?.trim();
    const cnpj = process.env.NFE_CNPJ_LEBLON?.trim();
    if (!certBase64 || !certPassword || !cnpj) {
      return {
        ok: false,
        error:
          "Certificado PROVISAO (leblon) não configurado no servidor. Defina NFE_CERT_BASE64_LEBLON, NFE_CERT_PASSWORD_LEBLON e NFE_CNPJ_LEBLON.",
      };
    }
    return { ok: true, credentials: { certBase64, certPassword, cnpj } };
  }

  return {
    ok: false,
    error:
      "Faça login com leblon ou ipanema para consultar pela chave de acesso, ou use a aba XML.",
  };
}
