import { readFileSync } from "fs";
import { join } from "path";

let cached: Record<string, string> | null = null;

function parseHashesFromEnv(): Record<string, string> | null {
  // AUTH_HASHES_B64: Base64 (evita problemas com $ e " na Vercel)
  const b64 = process.env.AUTH_HASHES_B64;
  if (b64) {
    try {
      const json = Buffer.from(b64, "base64").toString("utf-8");
      return JSON.parse(json) as Record<string, string>;
    } catch {
      console.error("[auth-hashes] AUTH_HASHES_B64 inválido");
    }
  }

  // AUTH_HASHES_JSON: JSON direto (pode corromper na Vercel com $ e ")
  const envJson = process.env.AUTH_HASHES_JSON;
  if (envJson) {
    try {
      return JSON.parse(envJson) as Record<string, string>;
    } catch {
      console.error("[auth-hashes] AUTH_HASHES_JSON inválido");
    }
  }

  return null;
}

export function getAuthHashes(): Record<string, string> {
  if (cached) return cached;

  const fromEnv = parseHashesFromEnv();
  if (fromEnv && Object.keys(fromEnv).length > 0) {
    cached = fromEnv;
    return cached;
  }

  // Arquivo local (desenvolvimento)
  try {
    const filePath = join(process.cwd(), "auth-hashes.json");
    const content = readFileSync(filePath, "utf-8");
    cached = JSON.parse(content) as Record<string, string>;
    return cached ?? {};
  } catch {
    return {};
  }
}
