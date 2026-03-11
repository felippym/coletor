import { readFileSync } from "fs";
import { join } from "path";

let cached: Record<string, string> | null = null;

export function getAuthHashes(): Record<string, string> {
  if (cached) return cached;

  // 1. Variável de ambiente (produção/Vercel - auth-hashes.json não é deployado)
  const envJson = process.env.AUTH_HASHES_JSON;
  if (envJson) {
    try {
      cached = JSON.parse(envJson) as Record<string, string>;
      return cached ?? {};
    } catch {
      console.error("[auth-hashes] AUTH_HASHES_JSON inválido");
    }
  }

  // 2. Arquivo local (desenvolvimento)
  try {
    const path = join(process.cwd(), "auth-hashes.json");
    const content = readFileSync(path, "utf-8");
    cached = JSON.parse(content) as Record<string, string>;
    return cached ?? {};
  } catch {
    return {};
  }
}
