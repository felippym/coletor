import type { FiscalRow } from "@/lib/fiscal-spreadsheet";

/**
 * API Cosmos (Bluesoft) — base: https://api.cosmos.bluesoft.com.br
 * Autenticação: header `X-Cosmos-Token` (token em https://cosmos.bluesoft.com.br).
 *
 * Serviços públicos (documentação oficial):
 * - GET /gtins/{código}
 * - GET /gpcs/{código}
 * - GET /ncms/{código}/products
 * - GET /products?query={descrição ou gtin}
 * - GET /products/by_date?date={ISO 8601} (janela máx. 7 dias)
 *
 * Varejista (opcional — defina COSMOS_RETAILER_API=true):
 * - GET /retailers/gtins/{código}
 * - GET /retailers/gpcs/{código}
 * - GET /retailers/ncms/{código}
 * - GET /retailers/products?query=
 *
 * Códigos: 200 sucesso; 401/403/404/422/429 etc. conforme doc; 429 = limite de política de acesso.
 */
const BASE_URL = "https://api.cosmos.bluesoft.com.br";

/** Usa rotas /retailers/* quando o token for de conta varejista (ver documentação). */
function useCosmosRetailerApi(): boolean {
  const v = process.env.COSMOS_RETAILER_API?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function cosmosGtinPath(code: string): string {
  const c = encodeURIComponent(code);
  return useCosmosRetailerApi() ? `/retailers/gtins/${c}` : `/gtins/${c}`;
}

/** Token em https://cosmos.bluesoft.com.br — nunca commitar no código. */
export function getCosmosToken(): string | null {
  const t = process.env.COSMOS_TOKEN?.trim();
  return t || null;
}

export function isCosmosConfigured(): boolean {
  return !!getCosmosToken();
}

/** GTIN/EAN na consulta: token único 8–14 dígitos ou primeiro grupo na string. */
export function extractCosmosCode(query: string): string | null {
  const compact = query.trim().replace(/\s/g, "");
  if (/^\d{8,14}$/.test(compact)) return compact;
  const m = query.match(/\d{8,14}/);
  return m ? m[0] : null;
}

type CosmosNcm = { code?: string; description?: string; full_description?: string };
type CosmosCest = { code?: string | number; description?: string };
type CosmosGpc = { code?: string; description?: string };
type CosmosGtinJson = {
  gtin?: number | string;
  description?: string;
  ncm?: CosmosNcm;
  cest?: CosmosCest;
  brand?: { name?: string };
  gpc?: CosmosGpc;
  gtins?: unknown[];
  net_weight?: number | string | null;
  gross_weight?: number | string | null;
  price?: string | number | null;
  avg_price?: number | string | null;
};

function str(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

const FISCAL_KEY_RX =
  /cst|csosn|icms|pis|cofins|ipi|tribut|fiscal|imposto|al[ií]quota|entrada|sa[ií]da/i;

function formatTribScalar(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return str(v);
  if (Array.isArray(v)) return v.slice(0, 12).map((x) => formatTribScalar(x)).filter(Boolean).join(", ");
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    const inner = Object.entries(o)
      .filter(([k]) => FISCAL_KEY_RX.test(k))
      .map(([k, val]) => `${k}: ${formatTribScalar(val)}`)
      .join("; ");
    if (inner) return `{ ${inner} }`;
    return JSON.stringify(o).slice(0, 280);
  }
  return "";
}

/** Extrai pares chave/valor fiscal presentes no JSON do GTIN (incl. objetos aninhados um nível). */
function tributacaoScan(data: Record<string, unknown>): string {
  const lines: string[] = [];
  const seen = new Set<string>();

  function push(label: string, val: unknown) {
    const s = formatTribScalar(val);
    if (!s) return;
    const line = `${label}: ${s}`;
    if (seen.has(line)) return;
    seen.add(line);
    lines.push(line);
  }

  for (const [k, v] of Object.entries(data)) {
    if (FISCAL_KEY_RX.test(k)) push(k, v);
  }
  for (const [k, v] of Object.entries(data)) {
    if (v === null || typeof v !== "object" || Array.isArray(v)) continue;
    const inner = v as Record<string, unknown>;
    for (const [k2, v2] of Object.entries(inner)) {
      if (FISCAL_KEY_RX.test(k2) || /entrada|sa[ií]da|in|out/i.test(k2)) {
        push(`${k}.${k2}`, v2);
      }
    }
  }
  return lines.slice(0, 45).join("\n").slice(0, 6000);
}

function formatPesoPreco(data: CosmosGtinJson): string {
  const parts: string[] = [];
  if (data.net_weight != null && data.net_weight !== "") {
    parts.push(`Peso líquido (g): ${str(data.net_weight)}`);
  }
  if (data.gross_weight != null && data.gross_weight !== "") {
    parts.push(`Peso bruto (g): ${str(data.gross_weight)}`);
  }
  const p = data.price ?? data.avg_price;
  if (p != null && p !== "") parts.push(`Preço referência: ${str(p)}`);
  return parts.join("\n");
}

function formatGpc(data: CosmosGtinJson): string {
  const g = data.gpc;
  if (!g) return "";
  const c = str(g.code);
  const d = str(g.description);
  if (!c && !d) return "";
  return c && d ? `${c} — ${d}` : c || d;
}

function formatRelatedGtins(data: CosmosGtinJson): string {
  const arr = data.gtins;
  if (!Array.isArray(arr)) return "";
  const main = str(data.gtin);
  const lines: string[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const code = o.gtin ?? o.code;
    if (code == null) continue;
    const s = str(code);
    if (s && main && s === main) continue;
    const cu = o.commercial_unit as Record<string, unknown> | undefined;
    const pack =
      cu && (cu.type_packaging != null || cu.quantity_packaging != null)
        ? `${str(cu.type_packaging)} × ${str(cu.quantity_packaging)}`
        : "";
    lines.push(pack ? `${s} (${pack})` : s);
  }
  return lines.slice(0, 25).join("\n");
}

function formatCestArrayLines(arr: unknown[]): string {
  const lines: string[] = [];
  for (const item of arr.slice(0, 80)) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const code = o.code ?? o.cest ?? o.codigo ?? o.cest_code;
    if (code == null) continue;
    const desc = o.description ?? o.descricao ?? o.name ?? "";
    lines.push(`${str(code)}${desc ? ` — ${str(desc)}` : ""}`);
  }
  return lines.join("\n");
}

/**
 * Extrai listas de CEST do envelope JSON de GET /ncms/{code}/products ou GET /retailers/ncms/{code}.
 * Rode `npm run cosmos:debug-ncm -- 33059000` e ajuste as chaves em `keys` se o formato mudar.
 */
function extractCestOptionsFromNcmPayload(json: unknown): string {
  if (!json || typeof json !== "object") return "";
  const tryObject = (o: Record<string, unknown>): string => {
    const keys = [
      "cests",
      "cest_list",
      "cestList",
      "relationCests",
      "cest_relations",
      "ncm_cests",
    ];
    for (const k of keys) {
      const v = o[k];
      if (Array.isArray(v)) {
        const text = formatCestArrayLines(v);
        if (text) return text;
      }
    }
    return "";
  };

  const root = json as Record<string, unknown>;
  let found = tryObject(root);
  if (found) return found;
  const data = root.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    found = tryObject(data as Record<string, unknown>);
    if (found) return found;
  }
  const ncm = root.ncm;
  if (ncm && typeof ncm === "object" && !Array.isArray(ncm)) {
    found = tryObject(ncm as Record<string, unknown>);
    if (found) return found;
  }
  return "";
}

/** Mapeia resposta do endpoint /gtins/{code} para o formato da consulta fiscal. */
export function cosmosGtinToFiscalRow(data: CosmosGtinJson): FiscalRow {
  const cest = data.cest?.code;
  const full = data as unknown as Record<string, unknown>;
  const trib = tributacaoScan(full);
  return {
    BASE_COL_1: str(data.gtin),
    BASE_COL_2: data.description ?? "",
    BASE_COL_3: data.ncm?.code ?? "",
    BASE_COL_4: cest !== undefined && cest !== null ? str(cest) : "",
    CFOP: "",
    SITUACAO: "Cosmos API",
    CSOSN: "",
    "CST PIS": "",
    _cosmos: true,
    _cosmos_ncm_desc: data.ncm?.full_description ?? data.ncm?.description ?? "",
    _cosmos_marca: data.brand?.name ?? "",
    _cosmos_cest_desc: str(data.cest?.description ?? ""),
    _cosmos_gpc: formatGpc(data),
    _cosmos_gtins_relacionados: formatRelatedGtins(data),
    _cosmos_peso_preco: formatPesoPreco(data),
    _cosmos_tributacao: trib,
  };
}

function mapProductLikeToRow(item: Record<string, unknown>): FiscalRow | null {
  const gtin = item.gtin ?? item.code;
  if (gtin === undefined || gtin === null) return null;
  const ncm = item.ncm as CosmosNcm | undefined;
  const cest = item.cest as CosmosCest | undefined;
  const cestCode = cest?.code;
  const trib = tributacaoScan(item);
  return {
    BASE_COL_1: str(gtin),
    BASE_COL_2: str(item.description ?? item.name ?? ""),
    BASE_COL_3: ncm?.code ? str(ncm.code) : "",
    BASE_COL_4: cestCode !== undefined && cestCode !== null ? str(cestCode) : "",
    CFOP: "",
    SITUACAO: "Cosmos API (NCM)",
    CSOSN: "",
    "CST PIS": "",
    _cosmos: true,
    _cosmos_ncm_desc: ncm?.full_description ?? ncm?.description ?? "",
    _cosmos_cest_desc: str(cest?.description ?? ""),
    ...(trib ? { _cosmos_tributacao: trib } : {}),
  };
}

function mapNcmProductsPayload(data: unknown, maxItems: number): FiscalRow[] {
  const d = data as {
    content?: unknown[];
    data?: unknown[];
    products?: unknown[];
    items?: unknown[];
  };
  const arr = d.content ?? d.data ?? d.products ?? d.items ?? [];
  if (!Array.isArray(arr)) return [];
  const out: FiscalRow[] = [];
  for (const item of arr) {
    if (out.length >= maxItems) break;
    if (!item || typeof item !== "object") continue;
    const row = mapProductLikeToRow(item as Record<string, unknown>);
    if (row) out.push(row);
  }
  return out;
}

async function cosmosFetch(path: string, params?: Record<string, string>): Promise<Response> {
  const token = getCosmosToken();
  if (!token) {
    return new Response(null, { status: 401 });
  }
  const url = new URL(path, BASE_URL);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  return fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
      "X-Cosmos-Token": token,
    },
    cache: "no-store",
  });
}

/**
 * GET /ncms/{ncm}/products (público) ou GET /retailers/ncms/{ncm} (varejista).
 * Retorna JSON bruto + linhas mapeadas para a consulta fiscal.
 */
async function fetchNcmProductsResponse(
  ncm: string,
  page: number,
): Promise<{ json: unknown | null; rows: FiscalRow[] }> {
  const clean = ncm.replace(/\D/g, "");
  if (clean.length !== 8) return { json: null, rows: [] };

  if (useCosmosRetailerApi()) {
    const res = await cosmosFetch(`/retailers/ncms/${encodeURIComponent(clean)}`);
    if (res.status === 404) return { json: null, rows: [] };
    if (!res.ok) {
      const msg = await res.text().catch(() => res.statusText);
      throw new Error(msg || `Cosmos retailers NCM HTTP ${res.status}`);
    }
    const json: unknown = await res.json();
    return { json, rows: mapNcmProductsPayload(json, 80) };
  }

  const res = await cosmosFetch(`/ncms/${encodeURIComponent(clean)}/products`, {
    page: String(page),
  });
  if (res.status === 404) return { json: null, rows: [] };
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || `Cosmos NCM HTTP ${res.status}`);
  }
  const json: unknown = await res.json();
  return { json, rows: mapNcmProductsPayload(json, 80) };
}

/** Lista possíveis CEST a partir do JSON documentado de NCM + produtos (sem rotas extras). */
export async function fetchCosmosNcmCestOptions(ncm: string): Promise<string> {
  const clean = ncm.replace(/\D/g, "");
  if (clean.length !== 8 || !isCosmosConfigured()) return "";
  try {
    const { json } = await fetchNcmProductsResponse(clean, 1);
    if (json) return extractCestOptionsFromNcmPayload(json);
  } catch {
    /* ignora */
  }
  return "";
}

async function enrichCosmosRowsWithNcmCestTables(rows: FiscalRow[]): Promise<FiscalRow[]> {
  if (rows.length === 0) return rows;
  const unique = new Set<string>();
  for (const r of rows) {
    const n = str(r.BASE_COL_3).replace(/\D/g, "");
    if (n.length === 8) {
      if (str(r._cosmos_cest_opcoes_ncm as string | undefined)) continue;
      unique.add(n);
    }
  }
  if (unique.size === 0) return rows;
  const cache = new Map<string, string>();
  await Promise.all(
    [...unique].map(async (n) => {
      try {
        cache.set(n, await fetchCosmosNcmCestOptions(n));
      } catch {
        cache.set(n, "");
      }
    }),
  );
  return rows.map((r) => {
    const n = str(r.BASE_COL_3).replace(/\D/g, "");
    const extra = n.length === 8 ? cache.get(n) ?? "" : "";
    if (!extra.trim()) return r;
    return { ...r, _cosmos_cest_opcoes_ncm: extra };
  });
}

/** Consulta produto por GTIN (8–14 dígitos). */
export async function fetchCosmosGtin(code: string): Promise<CosmosGtinJson | null> {
  const res = await cosmosFetch(cosmosGtinPath(code));
  if (res.status === 404) return null;
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || `Cosmos HTTP ${res.status}`);
  }
  return (await res.json()) as CosmosGtinJson;
}

/** Lista produtos vinculados ao NCM (8 dígitos). */
export async function fetchCosmosNcmProducts(
  ncm: string,
  page = 1,
): Promise<FiscalRow[]> {
  const { rows } = await fetchNcmProductsResponse(ncm, page);
  return rows;
}

/**
 * Tenta Cosmos: primeiro /gtins/{code}; se 404 e código com 8 dígitos, /ncms/{code}/products.
 */
export async function fetchCosmosRowsForQuery(query: string): Promise<FiscalRow[]> {
  if (!isCosmosConfigured()) return [];
  const code = extractCosmosCode(query);
  if (!code) return [];

  try {
    const gtinRes = await cosmosFetch(cosmosGtinPath(code));
    if (gtinRes.ok) {
      const data = (await gtinRes.json()) as CosmosGtinJson;
      const rows = [cosmosGtinToFiscalRow(data)];
      return enrichCosmosRowsWithNcmCestTables(rows);
    }
    if (code.length === 8 && gtinRes.status === 404) {
      const { json, rows } = await fetchNcmProductsResponse(code, 1);
      const cestBlock = json ? extractCestOptionsFromNcmPayload(json) : "";
      const withCest =
        cestBlock.trim().length > 0
          ? rows.map((r) => ({ ...r, _cosmos_cest_opcoes_ncm: cestBlock }))
          : rows;
      return enrichCosmosRowsWithNcmCestTables(withCest);
    }
  } catch {
    // falha silenciosa: rota ainda devolve só base local
  }
  return [];
}

export function mergeCosmosFirst(
  cosmosRows: FiscalRow[],
  localRows: FiscalRow[],
  limit: number,
): FiscalRow[] {
  const eanKey = (r: FiscalRow) => str(r.BASE_COL_1).replace(/\D/g, "");
  const seen = new Set<string>();
  const out: FiscalRow[] = [];

  for (const r of cosmosRows) {
    const k = eanKey(r);
    if (k) seen.add(k);
    out.push(r);
    if (out.length >= limit) return out;
  }
  for (const r of localRows) {
    const k = eanKey(r);
    if (k && seen.has(k)) continue;
    out.push(r);
    if (out.length >= limit) break;
  }
  return out;
}
