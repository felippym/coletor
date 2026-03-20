import { NextResponse } from "next/server";
import { fetchCosmosRowsForQuery, isCosmosConfigured } from "@/lib/cosmos-api";
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
    const body = (await req.json()) as {
      q?: string;
      limit?: number;
      scope?: "local" | "cosmos";
    };
    const q = typeof body.q === "string" ? body.q : "";
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number(body.limit) || DEFAULT_LIMIT)
    );
    const trimmed = q.trim();
    const scope = body.scope === "cosmos" ? "cosmos" : "local";

    async function resolveHeaders(): Promise<string[]> {
      const c = await getFiscalSupabaseCount();
      if (c != null && c > 0) {
        return getFiscalHeadersFromSupabase();
      }
      return loadFiscalSpreadsheet().headers;
    }

    if (scope === "cosmos") {
      if (!isCosmosConfigured()) {
        let headers: string[] = [];
        try {
          headers = await resolveHeaders();
        } catch {
          headers = [];
        }
        return NextResponse.json(
          {
            error:
              "Cosmos não configurado. Defina COSMOS_TOKEN no servidor.",
            headers,
            rows: [],
            matched: 0,
            source: "cosmos",
            cosmos: false,
          },
          { status: 503 }
        );
      }

      const headers = await resolveHeaders();
      const sbCount = await getFiscalSupabaseCount();
      const total =
        sbCount != null && sbCount > 0
          ? sbCount
          : loadFiscalSpreadsheet().rows.length;

      if (!trimmed) {
        return NextResponse.json({
          headers,
          rows: [],
          total,
          matched: 0,
          source: "cosmos",
          cosmos: true,
        });
      }

      const cosmosRows = await fetchCosmosRowsForQuery(trimmed);
      const rows = cosmosRows.slice(0, limit);
      return NextResponse.json({
        headers,
        rows,
        total,
        matched: rows.length,
        source: "cosmos",
        cosmos: true,
      });
    }

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
          cosmos: isCosmosConfigured(),
        });
      }
      const { rows, matched } = await searchFiscalSupabase(trimmed, limit);
      return NextResponse.json({
        headers,
        rows,
        total,
        matched,
        source: "supabase",
        cosmos: isCosmosConfigured(),
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
        cosmos: isCosmosConfigured(),
      });
    }

    const filtered = filterFiscalRows(allRows, trimmed, limit);
    return NextResponse.json({
      headers,
      rows: filtered,
      total: allRows.length,
      matched: filtered.length,
      source: "planilha_final_com_regras.xlsx",
      cosmos: isCosmosConfigured(),
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
        cosmos: isCosmosConfigured(),
      });
    }

    const { headers, rows } = loadFiscalSpreadsheet();
    return NextResponse.json({
      headers,
      total: rows.length,
      source: "planilha_final_com_regras.xlsx",
      cosmos: isCosmosConfigured(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao carregar base fiscal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
