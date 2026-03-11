import { readFileSync } from "fs";
import { join } from "path";

let cached: Record<string, string> | null = null;

export function getAuthHashes(): Record<string, string> {
  if (cached) return cached;
  try {
    const path = join(process.cwd(), "auth-hashes.json");
    const content = readFileSync(path, "utf-8");
    cached = JSON.parse(content) as Record<string, string>;
    return cached ?? {};
  } catch {
    return {};
  }
}
