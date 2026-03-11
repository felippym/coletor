import { getSupabase } from "./supabase";

export interface Produto {
  id: string;
  codigo: string | null;
  produto: string | null;
  cus_repos: number | null;
  pr_venda: number | null;
  pr_min: number | null;
  qt_estoque: number | null;
}

/** Busca produto por código na tabela public.produtos */
export async function getProdutoByCodigo(codigo: string): Promise<Produto | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const trimmed = codigo.trim();
  if (!trimmed) return null;

  const { data, error } = await supabase
    .from("produtos")
    .select("id, codigo, produto, cus_repos, pr_venda, pr_min, qt_estoque")
    .eq("codigo", trimmed)
    .maybeSingle();

  if (error || !data) return null;
  return data as Produto;
}

/** Busca múltiplos produtos por códigos (batch) */
export async function getProdutosByCodigos(codigos: string[]): Promise<Map<string, string>> {
  const supabase = getSupabase();
  const map = new Map<string, string>();
  if (!supabase || codigos.length === 0) return map;

  const unique = [...new Set(codigos.map((c) => c.trim()).filter(Boolean))];
  if (unique.length === 0) return map;

  const { data, error } = await supabase
    .from("produtos")
    .select("codigo, produto")
    .in("codigo", unique);

  if (error || !data) return map;

  for (const row of data) {
    if (row.codigo && row.produto) {
      map.set(row.codigo, row.produto);
    }
  }
  return map;
}
