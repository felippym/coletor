"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BadgePercent,
  Cloud,
  Database,
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
  cosmos?: boolean;
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

/** Linhas vindas da API Cosmos usam sempre estes nomes de coluna (independentes dos headers da planilha). */
const FISCAL_KEYS_COSMOS: ResolvedFiscalKeys = {
  ean: "BASE_COL_1",
  nome: "BASE_COL_2",
  ncm: "BASE_COL_3",
  cest: "BASE_COL_4",
  cfop: "CFOP",
  situacao: "SITUACAO",
  csosn: "CSOSN",
  cstPis: "CST PIS",
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

/** Bloco multilinha para listas longas (CEST do NCM, tributação bruta da API). */
function CosmosMultilineBlock({ label, text }: { label: string; text: string }) {
  const t = text.trim();
  if (!t) return null;
  return (
    <li className="list-none space-y-1.5">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <pre
        className="max-h-56 overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-[var(--border)]/60 bg-[var(--background)]/50 p-3 font-mono text-xs leading-relaxed text-[var(--foreground)]"
        tabIndex={0}
      >
        {t}
      </pre>
    </li>
  );
}

function FiscalResultCard({
  row,
  keys,
  cosmosExtras = false,
}: {
  row: FiscalRow;
  keys: ResolvedFiscalKeys;
  /** Exibe marca e descrição longa do NCM retornadas pelo Cosmos. */
  cosmosExtras?: boolean;
}) {
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
            {cosmosExtras && cell(row, "_cosmos_marca") ? (
              <FieldLine label="Marca" rowKey="_cosmos_marca" row={row} mono={false} />
            ) : null}
            {cosmosExtras ? (
              <CosmosMultilineBlock label="GPC (categoria)" text={cell(row, "_cosmos_gpc")} />
            ) : null}
            {cosmosExtras ? (
              <CosmosMultilineBlock
                label="Outros GTINs / embalagens"
                text={cell(row, "_cosmos_gtins_relacionados")}
              />
            ) : null}
            {cosmosExtras ? (
              <CosmosMultilineBlock label="Peso e preço (referência)" text={cell(row, "_cosmos_peso_preco")} />
            ) : null}
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
            {cosmosExtras && cell(row, "_cosmos_ncm_desc") ? (
              <FieldLine
                label="Descrição NCM"
                rowKey="_cosmos_ncm_desc"
                row={row}
                mono={false}
              />
            ) : null}
            <FieldLine label="CEST" rowKey={keys.cest} row={row} />
            {cosmosExtras ? (
              <CosmosMultilineBlock
                label="Descrição do CEST (produto)"
                text={cell(row, "_cosmos_cest_desc")}
              />
            ) : null}
            {cosmosExtras ? (
              <CosmosMultilineBlock
                label="CEST possíveis para o NCM (API /ncms)"
                text={cell(row, "_cosmos_cest_opcoes_ncm")}
              />
            ) : null}
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
          <ul className="space-y-3">
            <FieldLine label="CFOP" rowKey={keys.cfop} row={row} />
            <FieldLine label="Situação" rowKey={keys.situacao} row={row} mono={false} />
            <FieldLine label="CSOSN" rowKey={keys.csosn} row={row} />
            <FieldLine label="CST PIS" rowKey={keys.cstPis} row={row} />
            {cosmosExtras ? (
              <CosmosMultilineBlock
                label="CST / ICMS / PIS / COFINS (chaves retornadas pela API)"
                text={cell(row, "_cosmos_tributacao")}
              />
            ) : null}
          </ul>
        </section>
      </div>
    </article>
  );
}

export default function ConsultaFiscalPage() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);

  const [qLocal, setQLocal] = useState("");
  const [debouncedLocal, setDebouncedLocal] = useState("");
  const [rowsLocal, setRowsLocal] = useState<FiscalRow[]>([]);
  const [matchedLocal, setMatchedLocal] = useState(0);
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [searchErrorLocal, setSearchErrorLocal] = useState<string | null>(null);

  const [qCosmos, setQCosmos] = useState("");
  const [debouncedCosmos, setDebouncedCosmos] = useState("");
  const [rowsCosmos, setRowsCosmos] = useState<FiscalRow[]>([]);
  const [matchedCosmos, setMatchedCosmos] = useState(0);
  const [loadingCosmos, setLoadingCosmos] = useState(false);
  const [searchErrorCosmos, setSearchErrorCosmos] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedLocal(qLocal), 350);
    return () => clearTimeout(t);
  }, [qLocal]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedCosmos(qCosmos), 350);
    return () => clearTimeout(t);
  }, [qCosmos]);

  useEffect(() => {
    fetch("/api/fiscal/consult")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setMetaError(data.error);
        else setMeta(data as Meta);
      })
      .catch(() => setMetaError("Não foi possível carregar a base fiscal."));
  }, []);

  const runSearchLocal = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setRowsLocal([]);
      setMatchedLocal(0);
      setSearchErrorLocal(null);
      return;
    }
    setLoadingLocal(true);
    setSearchErrorLocal(null);
    try {
      const res = await fetch("/api/fiscal/consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: trimmed, scope: "local" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSearchErrorLocal(
          (data as { error?: string }).error ?? "Erro na consulta"
        );
        setRowsLocal([]);
        setMatchedLocal(0);
        return;
      }
      setRowsLocal((data as { rows: FiscalRow[] }).rows ?? []);
      setMatchedLocal((data as { matched: number }).matched ?? 0);
    } catch {
      setSearchErrorLocal("Falha de rede ao consultar.");
      setRowsLocal([]);
      setMatchedLocal(0);
    } finally {
      setLoadingLocal(false);
    }
  }, []);

  const runSearchCosmos = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setRowsCosmos([]);
      setMatchedCosmos(0);
      setSearchErrorCosmos(null);
      return;
    }
    setLoadingCosmos(true);
    setSearchErrorCosmos(null);
    try {
      const res = await fetch("/api/fiscal/consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: trimmed, scope: "cosmos" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSearchErrorCosmos(
          (data as { error?: string }).error ?? "Erro na consulta"
        );
        setRowsCosmos([]);
        setMatchedCosmos(0);
        return;
      }
      setRowsCosmos((data as { rows: FiscalRow[] }).rows ?? []);
      setMatchedCosmos((data as { matched: number }).matched ?? 0);
    } catch {
      setSearchErrorCosmos("Falha de rede ao consultar.");
      setRowsCosmos([]);
      setMatchedCosmos(0);
    } finally {
      setLoadingCosmos(false);
    }
  }, []);

  useEffect(() => {
    void runSearchLocal(debouncedLocal);
  }, [debouncedLocal, runSearchLocal]);

  useEffect(() => {
    if (!meta?.cosmos) {
      setRowsCosmos([]);
      setMatchedCosmos(0);
      setLoadingCosmos(false);
      setSearchErrorCosmos(null);
      return;
    }
    void runSearchCosmos(debouncedCosmos);
  }, [debouncedCosmos, meta?.cosmos, runSearchCosmos]);

  const allHeaders =
    meta?.headers ??
    (rowsLocal[0]
      ? Object.keys(rowsLocal[0])
      : rowsCosmos[0]
        ? Object.keys(rowsCosmos[0])
        : []);
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
                    {` · ${meta.total.toLocaleString("pt-BR")} linhas`}
                    {meta.cosmos ? " · Cosmos disponível" : ""}.
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

        <section className="space-y-3 rounded-2xl border border-[var(--border)]/70 bg-[var(--surface)]/40 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
            <Database className="h-4 w-4 shrink-0 text-[var(--primary)]" aria-hidden />
            <label htmlFor="fiscal-q-local">Base local</label>
          </div>
          <input
            id="fiscal-q-local"
            type="search"
            value={qLocal}
            onChange={(e) => setQLocal(e.target.value)}
            placeholder="Texto, EAN ou NCM — filtra só na planilha / Supabase…"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            autoComplete="off"
          />
          <p className="text-xs text-[var(--muted)]">
            Várias palavras exigem que todas apareçam no mesmo registro. Limite de 300 linhas por
            consulta.
          </p>

          {searchErrorLocal && (
            <div
              className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
              role="status"
            >
              {searchErrorLocal}
            </div>
          )}

          {debouncedLocal.trim() && loadingLocal && (
            <div className="flex flex-col gap-4" aria-busy="true">
              <span className="sr-only">Carregando base local…</span>
              <Skeleton className="h-4 w-64" />
              <SkeletonFiscalConsultResults count={2} />
            </div>
          )}

          {debouncedLocal.trim() && !loadingLocal && (
            <p className="text-sm text-[var(--muted)]">
              {matchedLocal === 0
                ? "Nenhum registro na base local."
                : `Mostrando até ${matchedLocal} registro(s) na base local.`}
            </p>
          )}

          {!loadingLocal && rowsLocal.length > 0 && (
            <div className="flex flex-col gap-4 pt-1">
              {rowsLocal.map((row, i) => (
                <FiscalResultCard key={`local-${i}`} row={row} keys={fiscalKeys} />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3 rounded-2xl border border-[var(--border)]/70 bg-[var(--surface)]/40 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
            <Cloud className="h-4 w-4 shrink-0 text-[var(--primary)]" aria-hidden />
            <label htmlFor="fiscal-q-cosmos">Cosmos (Bluesoft)</label>
          </div>
          <input
            id="fiscal-q-cosmos"
            type="search"
            value={qCosmos}
            onChange={(e) => setQCosmos(e.target.value)}
            placeholder={
              meta?.cosmos
                ? "GTIN/EAN (8–14 dígitos) ou NCM (8 dígitos)…"
                : "Configure COSMOS_TOKEN no servidor para habilitar"
            }
            disabled={!meta?.cosmos}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
            autoComplete="off"
          />
          <p className="text-xs text-[var(--muted)]">
            Consulta apenas{" "}
            <span className="font-mono text-[var(--foreground)]/90">
              api.cosmos.bluesoft.com.br
            </span>
            . GTIN retorna um produto; NCM de 8 dígitos lista produtos vinculados.
          </p>

          <details className="rounded-xl border border-[var(--border)]/60 bg-[var(--surface)]/50 px-3 py-2 text-xs text-[var(--muted)]">
            <summary className="cursor-pointer select-none font-medium text-[var(--foreground)]">
              Rotas e informações lidas no Cosmos
            </summary>
            <div className="mt-3 space-y-3 border-t border-[var(--border)]/50 pt-3">
              <div>
                <p className="mb-1 font-medium text-[var(--foreground)]/90">
                  Serviços oficiais (GET +{" "}
                  <span className="font-mono text-[11px]">X-Cosmos-Token</span>)
                </p>
                <p className="mb-1.5 text-[11px] leading-snug">
                  Catálogo geral:{" "}
                  <span className="font-mono">/gtins/{"{código}"}</span>,{" "}
                  <span className="font-mono">/gpcs/{"{código}"}</span>,{" "}
                  <span className="font-mono">/ncms/{"{código}"}/products</span>,{" "}
                  <span className="font-mono">/products?query=</span>,{" "}
                  <span className="font-mono">/products/by_date?date=</span> (ISO 8601, máx. 7 dias).
                  Varejista (env <span className="font-mono">COSMOS_RETAILER_API</span>):{" "}
                  <span className="font-mono">/retailers/gtins/…</span>,{" "}
                  <span className="font-mono">/retailers/ncms/…</span>, etc.
                </p>
                <ul className="list-inside list-disc space-y-0.5 pl-0.5">
                  <li>
                    Esta tela usa o grupo de 8–14 dígitos em{" "}
                    <span className="font-mono text-[11px]">/gtins/{"{código}"}</span> (ou{" "}
                    <span className="font-mono text-[11px]">/retailers/gtins/…</span> se varejista).
                  </li>
                  <li>
                    Se o GTIN retornar 404 e o código tiver 8 dígitos, usa{" "}
                    <span className="font-mono text-[11px]">
                      /ncms/{"{ncm}"}/products?page=1
                    </span>{" "}
                    (ou <span className="font-mono text-[11px]">/retailers/ncms/{"{ncm}"}</span>) —
                    até 80 produtos na primeira página.
                  </li>
                  <li>
                    Opções de CEST por NCM vêm do <strong>mesmo JSON</strong> dessa resposta, quando a
                    API incluir listas no envelope (não há rota separada na documentação pública).
                  </li>
                </ul>
              </div>
              <div>
                <p className="mb-1 font-medium text-[var(--foreground)]/90">
                  Resposta por GTIN (um registro)
                </p>
                <ul className="list-inside list-disc space-y-0.5 pl-0.5">
                  <li>
                    <span className="font-mono">gtin</span> → EAN;{" "}
                    <span className="font-mono">description</span> → nome do produto
                  </li>
                  <li>
                    <span className="font-mono">ncm.code</span> → NCM;{" "}
                    <span className="font-mono">ncm.full_description</span> ou{" "}
                    <span className="font-mono">ncm.description</span> → texto do NCM (guardado
                    internamente)
                  </li>
                  <li>
                    <span className="font-mono">cest.code</span> → CEST
                  </li>
                  <li>
                    <span className="font-mono">brand.name</span> → marca (guardada internamente)
                  </li>
                  <li>CFOP, CSOSN e CST PIS não vêm da API aqui (ficam vazios); situação exibida como “Cosmos API”.</li>
                </ul>
              </div>
              <div>
                <p className="mb-1 font-medium text-[var(--foreground)]/90">
                  Lista por NCM (cada item do array retornado)
                </p>
                <ul className="list-inside list-disc space-y-0.5 pl-0.5">
                  <li>
                    Corpo JSON: primeiro array encontrado em{" "}
                    <span className="font-mono">content</span>,{" "}
                    <span className="font-mono">data</span>,{" "}
                    <span className="font-mono">products</span> ou{" "}
                    <span className="font-mono">items</span>.
                  </li>
                  <li>
                    Por produto: <span className="font-mono">gtin</span> ou{" "}
                    <span className="font-mono">code</span> → EAN;{" "}
                    <span className="font-mono">description</span> ou{" "}
                    <span className="font-mono">name</span> → nome;{" "}
                    <span className="font-mono">ncm</span> (código e descrições) → NCM;{" "}
                    <span className="font-mono">cest.code</span> → CEST; situação “Cosmos API
                    (NCM)”.
                  </li>
                </ul>
              </div>
            </div>
          </details>

          {meta && !meta.cosmos && (
            <p className="text-xs text-amber-200/90">
              Sem <span className="font-medium">COSMOS_TOKEN</span> no servidor, a busca Cosmos fica
              desativada.
            </p>
          )}

          {searchErrorCosmos && (
            <div
              className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
              role="status"
            >
              {searchErrorCosmos}
            </div>
          )}

          {meta?.cosmos && debouncedCosmos.trim() && loadingCosmos && (
            <div className="flex flex-col gap-4" aria-busy="true">
              <span className="sr-only">Carregando Cosmos…</span>
              <Skeleton className="h-4 w-64" />
              <SkeletonFiscalConsultResults count={2} />
            </div>
          )}

          {meta?.cosmos && debouncedCosmos.trim() && !loadingCosmos && (
            <p className="text-sm text-[var(--muted)]">
              {matchedCosmos === 0
                ? "Nenhum resultado no Cosmos para este código."
                : `Mostrando ${matchedCosmos} resultado(s) do Cosmos.`}
            </p>
          )}

          {meta?.cosmos && !loadingCosmos && rowsCosmos.length > 0 && (
            <div className="flex flex-col gap-4 pt-1">
              {rowsCosmos.map((row, i) => (
                <FiscalResultCard
                  key={`cosmos-${i}`}
                  row={row}
                  keys={FISCAL_KEYS_COSMOS}
                  cosmosExtras
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
