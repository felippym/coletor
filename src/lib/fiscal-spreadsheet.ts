import path from "path";
import fs from "fs";
import * as XLSX from "xlsx";

const FILENAME = "planilha_final_com_regras.xlsx";

export type FiscalRow = Record<string, string | number | boolean | null | undefined>;

let cache: { headers: string[]; rows: FiscalRow[] } | null = null;

function resolvePath(): string {
  return path.join(process.cwd(), "data", "fiscal", FILENAME);
}

export function loadFiscalSpreadsheet(): { headers: string[]; rows: FiscalRow[] } {
  if (cache) return cache;

  const filePath = resolvePath();
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Planilha local não encontrada (${FILENAME}). Use a base no Supabase ou coloque o xlsx em data/fiscal/.`
    );
  }

  const wb = XLSX.readFile(filePath);
  const name = wb.SheetNames[0];
  if (!name) {
    throw new Error("Planilha sem abas.");
  }

  const sheet = wb.Sheets[name];
  const rows = XLSX.utils.sheet_to_json<FiscalRow>(sheet, {
    defval: "",
    raw: false,
  });

  const headers =
    rows.length > 0 ? Object.keys(rows[0] as FiscalRow) : [];

  cache = { headers, rows };
  return cache;
}

function cellText(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).toLowerCase().trim();
}

/** Termos em qualquer célula (AND). */
export function filterFiscalRows(
  rows: FiscalRow[],
  query: string,
  limit: number
): FiscalRow[] {
  const terms = query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (terms.length === 0) return [];

  const out: FiscalRow[] = [];
  for (const row of rows) {
    const hay = Object.values(row).map(cellText).join(" ");
    if (terms.every((t) => hay.includes(t))) {
      out.push(row);
      if (out.length >= limit) break;
    }
  }
  return out;
}

export function fiscalRowCount(): number {
  return loadFiscalSpreadsheet().rows.length;
}
