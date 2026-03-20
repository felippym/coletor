import { NextResponse } from "next/server";
import {
  filterFiscalRows,
  loadFiscalSpreadsheet,
} from "@/lib/fiscal-spreadsheet";
import {
  getFiscalSupabaseCount,
  getFiscalHeadersFromSupabase,
  searchFiscalSupabase,
} from "@/lib/fiscal-supabase";

const DEFAULT_LIMIT = 300;
const MAX_LIMIT = 500;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { q?: string; limit?: number };
    const q = typeof body.q === "string" ? body.q : "";
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number(body.limit) || DEFAULT_LIMIT)
    );
    const trimmed = q.trim();

    const sbCount = await getFiscalSupabaseCount();
    if (sbCount != null && sbCount > 0) {
      const headers = await getFiscalHeadersFromSupabase();
      const total = sbCount;
      if (!trimmed) {
        return NextResponse.json({
          headers,
          rows: [],
          total,
          matched: 0,
          source: "supabase",
        });
      }
      const { rows, matched } = await searchFiscalSupabase(trimmed, limit);
      return NextResponse.json({
        headers,
        rows,
        total,
        matched,
        source: "supabase",
      });
    }

    const { headers, rows: allRows } = loadFiscalSpreadsheet();
    if (!trimmed) {
      return NextResponse.json({
        headers,
        rows: [] as typeof allRows,
        total: allRows.length,
        matched: 0,
        source: "planilha_final_com_regras.xlsx",
      });
    }

    const filtered = filterFiscalRows(allRows, trimmed, limit);
    return NextResponse.json({
      headers,
      rows: filtered,
      total: allRows.length,
      matched: filtered.length,
      source: "planilha_final_com_regras.xlsx",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao consultar base fiscal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const sbCount = await getFiscalSupabaseCount();
    if (sbCount != null && sbCount > 0) {
      const headers = await getFiscalHeadersFromSupabase();
      return NextResponse.json({
        headers,
        total: sbCount,
        source: "supabase",
      });
    }

    const { headers, rows } = loadFiscalSpreadsheet();
    return NextResponse.json({
      headers,
      total: rows.length,
      source: "planilha_final_com_regras.xlsx",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao carregar base fiscal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
