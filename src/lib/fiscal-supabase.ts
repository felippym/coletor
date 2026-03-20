import { getSupabaseServerAnon } from "./supabase";
import type { FiscalRow } from "./fiscal-spreadsheet";

/** Há linhas na tabela fiscal_regras (anon + RLS de leitura). */
export async function getFiscalSupabaseCount(): Promise<number | null> {
  const sb = getSupabaseServerAnon();
  if (!sb) return null;
  const { count, error } = await sb
    .from("fiscal_regras")
    .select("*", { count: "exact", head: true });
  if (error) {
    console.warn("[fiscal] contagem supabase:", error.message);
    return null;
  }
  return count ?? 0;
}

export async function getFiscalHeadersFromSupabase(): Promise<string[]> {
  const sb = getSupabaseServerAnon();
  if (!sb) return [];
  const { data, error } = await sb
    .from("fiscal_regras")
    .select("row_data")
    .limit(1)
    .maybeSingle();
  if (error || !data?.row_data || typeof data.row_data !== "object") return [];
  return Object.keys(data.row_data as Record<string, unknown>);
}

export async function searchFiscalSupabase(
  query: string,
  limit: number
): Promise<{ rows: FiscalRow[]; matched: number }> {
  const terms = query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter((t) => t.trim() !== "");
  if (terms.length === 0) return { rows: [], matched: 0 };

  const sb = getSupabaseServerAnon();
  if (!sb) throw new Error("Supabase não configurado");

  const { data, error } = await sb.rpc("search_fiscal_regras", {
    search_terms: terms,
    result_limit: limit,
  });

  if (error) throw error;

  type RpcRow = { row_data: FiscalRow };
  const raw = (data ?? []) as RpcRow[];
  const rows = raw.map((r) => r.row_data).filter(Boolean) as FiscalRow[];
  return { rows, matched: rows.length };
}
