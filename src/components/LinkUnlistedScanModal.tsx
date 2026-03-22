"use client";

import { useEffect, useMemo, useState } from "react";
import { Link2, Package, Search, X } from "lucide-react";
import { getProdutoByCodigo } from "@/lib/produtos";
import { NFE_PRODUCT_NOT_ON_INVOICE, type NFeProduct } from "@/types/nfe";

export type LinkableRow = { product: NFeProduct; originalIndex: number };

interface LinkUnlistedScanModalProps {
  open: boolean;
  ean: string;
  linkableRows: LinkableRow[];
  onCancel: () => void;
  onRegisterWithoutLink: () => void;
  onLinkToRow: (originalIndex: number) => void;
  /** Linha já existente “não listada” — abre direto na escolha do item e soma o conferido */
  mergeFromExistingRow?: boolean;
  mergeCountedQty?: number;
  initialStep?: "choice" | "pick";
}

export function LinkUnlistedScanModal({
  open,
  ean,
  linkableRows,
  onCancel,
  onRegisterWithoutLink,
  onLinkToRow,
  mergeFromExistingRow = false,
  mergeCountedQty,
  initialStep = "choice",
}: LinkUnlistedScanModalProps) {
  const [step, setStep] = useState<"choice" | "pick">(initialStep);
  const [catalogName, setCatalogName] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) {
      setStep("choice");
      setSearch("");
      setCatalogName(null);
      return;
    }
    setStep(initialStep);
    getProdutoByCodigo(ean).then((p) => setCatalogName(p?.produto ?? null));
  }, [open, ean, initialStep]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return linkableRows;
    return linkableRows.filter(
      ({ product }) =>
        product.description.toLowerCase().includes(q) ||
        product.ean.toLowerCase().includes(q) ||
        product.linkedScanCodes?.some((c) => c.toLowerCase().includes(q))
    );
  }, [linkableRows, search]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[45] flex flex-col justify-end sm:justify-center sm:p-4">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div
        className="relative z-10 flex max-h-[min(90dvh,640px)] flex-col overflow-hidden rounded-t-3xl border-2 border-[var(--border)] bg-[var(--surface)] shadow-2xl sm:mx-auto sm:w-full sm:max-w-lg sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="link-unlisted-title"
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
          <h2 id="link-unlisted-title" className="text-lg font-semibold text-[var(--foreground)]">
            {step === "choice"
              ? mergeFromExistingRow
                ? "Vincular à NFe"
                : "Código não identificado na NFe"
              : "Vincular a um item da nota"}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
            aria-label="Cancelar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <p className="font-mono text-base font-bold tracking-wide text-[var(--foreground)]">{ean}</p>
          {catalogName && (
            <p className="mt-1 text-sm text-[var(--secondary)]">
              Catálogo: <span className="font-medium text-[var(--foreground)]">{catalogName}</span>
            </p>
          )}
          {!catalogName && step === "choice" && !mergeFromExistingRow && (
            <p className="mt-1 text-sm text-[var(--muted)]">Não identificado na nota fiscal.</p>
          )}

          {step === "choice" && (
            <>
              <p className="mt-4 text-sm leading-relaxed text-[var(--secondary)]">
                {mergeFromExistingRow ? (
                  <>
                    Este item está como <span className="whitespace-nowrap font-medium">{NFE_PRODUCT_NOT_ON_INVOICE}</span>
                    {mergeCountedQty != null && mergeCountedQty > 0 && (
                      <>
                        . Serão somadas <strong className="text-[var(--foreground)]">{mergeCountedQty}</strong> unidade
                        {mergeCountedQty !== 1 ? "s" : ""} conferida
                        {mergeCountedQty !== 1 ? "s" : ""} ao produto da nota que você escolher.
                      </>
                    )}
                  </>
                ) : (
                  <>
                    Este código não aparece nos itens desta NFe. Você pode{" "}
                    <strong className="text-[var(--foreground)]">vincular</strong> a um produto listado na nota ou registrar como{" "}
                    <span className="whitespace-nowrap">{NFE_PRODUCT_NOT_ON_INVOICE}</span>.
                  </>
                )}
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setStep("pick")}
                  disabled={linkableRows.length === 0}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] font-semibold text-[var(--primary-foreground)] transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Link2 className="h-5 w-5 shrink-0" />
                  Vincular a item da NFe
                </button>
                {linkableRows.length === 0 && (
                  <p className="text-center text-xs text-[var(--destructive)]">
                    Não há itens da NFe na conferência para vincular.
                  </p>
                )}
                {!mergeFromExistingRow && (
                  <button
                    type="button"
                    onClick={onRegisterWithoutLink}
                    className="flex h-12 w-full items-center justify-center rounded-2xl border-2 border-[var(--border)] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)]"
                  >
                    Registrar sem vínculo
                  </button>
                )}
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex h-11 w-full items-center justify-center text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
                >
                  {mergeFromExistingRow ? "Cancelar" : "Cancelar leitura"}
                </button>
              </div>
            </>
          )}

          {step === "pick" && (
            <>
              {mergeFromExistingRow && mergeCountedQty != null && mergeCountedQty > 0 && (
                <p className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-3 py-2 text-sm text-[var(--secondary)]">
                  Serão transferidas <strong className="text-[var(--foreground)]">{mergeCountedQty}</strong> unidade
                  {mergeCountedQty !== 1 ? "s" : ""} conferida{mergeCountedQty !== 1 ? "s" : ""} para o item da nota que
                  você escolher abaixo.
                </p>
              )}
              <div className="relative mt-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  type="search"
                  placeholder="Buscar por descrição ou EAN..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                  className="w-full rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] py-2.5 pl-10 pr-3 text-sm text-[var(--foreground)] placeholder-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                />
              </div>
              <ul className="mt-3 space-y-2 pb-2">
                {filtered.length === 0 ? (
                  <li className="py-8 text-center text-sm text-[var(--muted)]">Nenhum item encontrado.</li>
                ) : (
                  filtered.map(({ product, originalIndex }) => (
                    <li key={`${product.ean}-${originalIndex}`}>
                      <button
                        type="button"
                        onClick={() => onLinkToRow(originalIndex)}
                        className="flex w-full items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)]/50 p-3 text-left transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent)]/5"
                      >
                        <Package className="mt-0.5 h-5 w-5 shrink-0 text-[var(--muted)]" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-snug text-[var(--foreground)]">
                            {product.description}
                          </p>
                          <p className="mt-0.5 font-mono text-xs text-[var(--muted)]">{product.ean}</p>
                          <p className="mt-1 text-xs text-[var(--secondary)]">
                            Esperado {product.expectedQty} · Conferido {product.countedQty}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))
                )}
              </ul>
              {mergeFromExistingRow ? (
                <button
                  type="button"
                  onClick={onCancel}
                  className="mt-2 w-full py-2 text-sm font-medium text-[var(--accent)]"
                >
                  Cancelar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setStep("choice")}
                  className="mt-2 w-full py-2 text-sm font-medium text-[var(--accent)]"
                >
                  ← Voltar
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
