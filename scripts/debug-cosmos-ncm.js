/**
 * Imprime JSON bruto dos endpoints NCM documentados no Cosmos para ajustar
 * `extractCestOptionsFromNcmPayload` em src/lib/cosmos-api.ts.
 *
 * Uso:
 *   node scripts/debug-cosmos-ncm.js 33059000
 *
 * Lê COSMOS_TOKEN e opcionalmente COSMOS_RETAILER_API do .env.local.
 */

require("dotenv").config({
  path: require("path").join(process.cwd(), ".env.local"),
});

const BASE = "https://api.cosmos.bluesoft.com.br";
const token = process.env.COSMOS_TOKEN?.trim();
const retailer =
  /^(1|true|yes)$/i.test(String(process.env.COSMOS_RETAILER_API ?? "").trim());
const ncm = process.argv[2]?.replace(/\D/g, "");

if (!token) {
  console.error("Defina COSMOS_TOKEN no .env.local");
  process.exit(1);
}
if (!ncm || ncm.length !== 8) {
  console.error(
    "Passe um NCM de 8 dígitos, ex.: node scripts/debug-cosmos-ncm.js 33059000",
  );
  process.exit(1);
}

async function get(path, params) {
  const url = new URL(path, BASE);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "X-Cosmos-Token": token,
    },
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { url: url.toString(), status: res.status, ok: res.ok, body };
}

(async () => {
  const enc = encodeURIComponent(ncm);
  const paths = retailer
    ? [[`GET /retailers/ncms/{ncm}`, `/retailers/ncms/${enc}`]]
    : [[`GET /ncms/{ncm}/products?page=1`, `/ncms/${enc}/products`, { page: "1" }]];

  for (const entry of paths) {
    const [label, path, params] = entry;
    console.log(`\n========== ${label} ==========`);
    const r = await get(path, params);
    console.log("HTTP", r.status, r.ok ? "" : "(falhou)");
    console.log(JSON.stringify(r.body, null, 2));
  }

  console.log(
    "\n--- Documentação: serviços públicos em https://cosmos.bluesoft.com.br/api",
  );
  console.log(
    "    Procure no JSON um array de CEST (code + description) e alinhe extractCestOptionsFromNcmPayload.",
  );
})();
