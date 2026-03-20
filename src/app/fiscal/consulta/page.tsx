"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BadgePercent,
  FileSearch,
  Package,
  Tags,
} from "lucide-react";
import { Skeleton, SkeletonFiscalConsultResults } from "@/components/Skeleton";
import type { FiscalRow } from "@/lib/fiscal-spreadsheet";

type Meta = {
  headers: string[];
  total: number;
  source: string;
};

type ResolvedFiscalKeys = {
  ean?: string;
  nome?: string;
  ncm?: string;
  cest?: string;
  cfop?: string;
  situacao?: string;
  csosn?: string;
  cstPis?: string;
};

function normalizeHeader(s: string): string {
  return s
    .trim()
    .toUpperCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");
}

function resolveHeader(wanted: string, available: string[]): string | undefined {
  const nw = normalizeHeader(wanted);
  return available.find((h) => normalizeHeader(h) === nw);
}

function resolveFiscalKeys(allHeaders: string[]): ResolvedFiscalKeys {
  return {
    ean: resolveHeader("BASE_COL_1", allHeaders),
    nome: resolveHeader("BASE_COL_2", allHeaders),
    ncm: resolveHeader("BASE_COL_3", allHeaders),
    cest: resolveHeader("BASE_COL_4", allHeaders),
    cfop: resolveHeader("CFOP", allHeaders),
    situacao: resolveHeader("SITUACAO", allHeaders),
    csosn: resolveHeader("CSOSN", allHeaders),
    cstPis: resolveHeader("CST PIS", allHeaders),
  };
}

function cell(row: FiscalRow, key?: string): string {
  if (!key) return "";
  const v = row[key];
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function FieldLine({
  label,
  rowKey,
  row,
  mono = true,
}: {
  label: string;
  rowKey?: string;
  row: FiscalRow;
  mono?: boolean;
}) {
  if (!rowKey) return null;
  const text = cell(row, rowKey);
  return (
    <li className="relative pl-4 text-sm text-[var(--foreground)] before:absolute before:left-0 before:text-[var(--muted)] before:content-['-']">
      <span className="text-[var(--muted)]">{label}:</span>{" "}
      <span
        className={
          mono
            ? "font-mono text-[var(--foreground)]"
            : "text-[var(--foreground)]"
        }
      >
        {text || "—"}
      </span>
    </li>
  );
}

function FiscalResultCard({ row, keys }: { row: FiscalRow; keys: ResolvedFiscalKeys }) {
  return (
    <article
      className="rounded-2xl border border-[var(--border)]/70 bg-[var(--surface)] p-5 shadow-sm"
      role="article"
    >
      <div className="space-y-5">
        <section>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[var(--foreground)]">
            <Package
              className="h-4 w-4 shrink-0 text-[var(--primary)]"
              aria-hidden
            />
            Produto
          </h2>
          <ul className="space-y-1.5">
            <FieldLine label="EAN" rowKey={keys.ean} row={row} />
            <FieldLine label="Nome" rowKey={keys.nome} row={row} mono={false} />
          </ul>
        </section>

        <div className="h-px bg-[var(--border)]/60" aria-hidden />

        <section>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[var(--foreground)]">
            <Tags className="h-4 w-4 shrink-0 text-[var(--primary)]" aria-hidden />
            Classificação
          </h2>
          <ul className="space-y-1.5">
            <FieldLine label="NCM" rowKey={keys.ncm} row={row} />
            <FieldLine label="CEST" rowKey={keys.cest} row={row} />
          </ul>
        </section>

        <div className="h-px bg-[var(--border)]/60" aria-hidden />

        <section>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[var(--foreground)]">
            <BadgePercent
              className="h-4 w-4 shrink-0 text-[var(--primary)]"
              aria-hidden
            />
            Tributação
          </h2>
          <ul className="space-y-1.5">
            <FieldLine label="CFOP" rowKey={keys.cfop} row={row} />
            <FieldLine label="Situação" rowKey={keys.situacao} row={row} mono={false} />
            <FieldLine label="CSOSN" rowKey={keys.csosn} row={row} />
            <FieldLine label="CST PIS" rowKey={keys.cstPis} row={row} />
          </ul>
        </section>
      </div>
    </article>
  );
}

export default function ConsultaFiscalPage() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [rows, setRows] = useState<FiscalRow[]>([]);
  const [matched, setMatched] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    fetch("/api/fiscal/consult")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setMetaError(data.error);
        else setMeta(data as Meta);
      })
      .catch(() => setMetaError("Não foi possível carregar a base fiscal."));
  }, []);

  const runSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setRows([]);
      setMatched(0);
      setSearchError(null);
      return;
    }
    setLoading(true);
    setSearchError(null);
    try {
      const res = await fetch("/api/fiscal/consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSearchError((data as { error?: string }).error ?? "Erro na consulta");
        setRows([]);
        setMatched(0);
        return;
      }
      setRows((data as { rows: FiscalRow[] }).rows ?? []);
      setMatched((data as { matched: number }).matched ?? 0);
    } catch {
      setSearchError("Falha de rede ao consultar.");
      setRows([]);
      setMatched(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void runSearch(debounced);
  }, [debounced, runSearch]);

  const allHeaders = meta?.headers ?? (rows[0] ? Object.keys(rows[0]) : []);
  const fiscalKeys = useMemo(() => resolveFiscalKeys(allHeaders), [allHeaders]);

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--background)]">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/95 pt-[env(safe-area-inset-top)] backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-[var(--secondary)] transition-colors hover:text-[var(--foreground)]"
            >
              <ArrowLeft className="h-5 w-5 shrink-0" />
              <span className="text-sm font-medium">Início</span>
            </Link>
          </div>
          <div className="mt-4 flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-hover)] text-[var(--primary)]">
              <FileSearch className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
                Consulta Fiscal
              </h1>
              <div className="mt-0.5 text-sm text-[var(--muted)]">
                {metaError ? (
                  <span>Base indisponível.</span>
                ) : meta ? (
                  <p>
                    {meta.source === "supabase"
                      ? "Base no Supabase"
                      : "Base local (planilha)"}
                    {` · ${meta.total.toLocaleString("pt-BR")} linhas`}.
                  </p>
                ) : (
                  <Skeleton className="h-4 w-56" />
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        {metaError && (
          <div
            className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
            role="alert"
          >
            {metaError}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="fiscal-q" className="text-sm font-medium text-[var(--foreground)]">
            Buscar na base
          </label>
          <div className="relative">
            <input
              id="fiscal-q"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="EAN, NCM, descrição, CFOP, situação… (várias palavras refinam o resultado)"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              autoComplete="off"
            />
          </div>
          <p className="text-xs text-[var(--muted)]">
            A busca ignora maiúsculas/minúsculas. Use várias palavras para exigir todas no mesmo
            registro (ex.: <span className="font-mono">5403 substituição</span>).
          </p>
        </div>

        {searchError && (
          <div
            className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
            role="status"
          >
            {searchError}
          </div>
        )}

        {debounced.trim() && loading && (
          <div className="flex flex-col gap-4" aria-busy="true">
            <span className="sr-only">Carregando resultados…</span>
            <Skeleton className="h-4 w-64" />
            <SkeletonFiscalConsultResults count={2} />
          </div>
        )}

        {debounced.trim() && !loading && (
          <p className="text-sm text-[var(--muted)]">
            {matched === 0
              ? "Nenhum registro encontrado (limite de 300 linhas por consulta)."
              : `Mostrando até ${matched} registro(s) correspondentes.`}
          </p>
        )}

        {!loading && rows.length > 0 && (
          <div className="flex flex-col gap-4">
            {rows.map((row, i) => (
              <FiscalResultCard key={i} row={row} keys={fiscalKeys} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
