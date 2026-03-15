"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Minus, Plus, Clock, Package, FileText } from "lucide-react";
import { getNFeConference, saveNFeConference } from "@/lib/nfe-storage";
import { HiddenBarcodeInput } from "@/components/HiddenBarcodeInput";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { ScanConfirmation } from "@/components/ScanConfirmation";
import type { NFeConference, NFeProduct } from "@/types/nfe";

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function NFeConferencePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const [conference, setConference] = useState<NFeConference | null>(null);
  const [search, setSearch] = useState("");
  const [confirmScan, setConfirmScan] = useState<{ ean: string; quantity: number } | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");

  useEffect(() => {
    getNFeConference(id).then(setConference);
  }, [id]);

  const filteredProducts = useMemo(() => {
    if (!conference) return [];
    const q = search.trim().toLowerCase();
    return conference.products
      .map((product, originalIndex) => ({ product, originalIndex }))
      .filter(
        ({ product }) =>
          !q ||
          product.description.toLowerCase().includes(q) ||
          product.ean.toLowerCase().includes(q)
      );
  }, [conference, search]);

  const processBarcode = useCallback(
    (ean: string) => {
      const trimmed = ean.trim();
      if (!trimmed || !conference) return;

      const products = [...conference.products];
      const idx = products.findIndex((p) => p.ean === trimmed);

      if (idx >= 0) {
        products[idx] = {
          ...products[idx],
          countedQty: products[idx].countedQty + 1,
        };
      } else {
        products.push({
          ean: trimmed,
          description: "Produto não listado na NFe",
          expectedQty: 0,
          unitPrice: 0,
          countedQty: 1,
        });
      }

      const updated = { ...conference, products };
      setConference(updated);
      void saveNFeConference(updated);

      const product = products.find((p) => p.ean === trimmed);
      const totalQty = product?.countedQty ?? 1;
      setConfirmScan({ ean: trimmed, quantity: totalQty });
      setBarcodeInput("");
    },
    [conference]
  );

  const updateProduct = useCallback(
    (index: number, updates: Partial<NFeProduct>) => {
      if (!conference) return;
      const products = [...conference.products];
      const idx = conference.products.findIndex((_, i) => i === index);
      if (idx < 0) return;
      products[idx] = { ...products[idx], ...updates };
      const updated = { ...conference, products };
      setConference(updated);
      void saveNFeConference(updated);
    },
    [conference]
  );

  const handleFinish = useCallback(() => {
    router.push("/");
  }, [router]);

  useEffect(() => {
    if (conference) {
      barcodeInputRef.current?.focus();
    }
  }, [conference]);

  if (!conference) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-[var(--secondary)]">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--background)]">
      <HiddenBarcodeInput onScan={processBarcode} />

      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/95 pt-[env(safe-area-inset-top)] backdrop-blur-sm">
        <div className="mx-auto max-w-2xl px-4 py-4 pr-20">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <Link
              href="/nfe"
              className="flex w-fit items-center gap-1.5 text-[var(--secondary)] transition-colors hover:text-[var(--foreground)]"
            >
              <svg
                className="h-5 w-5 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <span>Voltar</span>
            </Link>
            <h1 className="min-w-0 truncate text-center text-xl font-semibold text-[var(--foreground)]">
              Conferência NFe
            </h1>
            <div className="w-16" />
          </div>
          <div className="-mx-4 mt-3 flex flex-nowrap items-center gap-x-3 overflow-x-auto px-4 pb-1 pr-24 text-sm text-[var(--muted)] [&::-webkit-scrollbar]:hidden">
            <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
              <FileText className="h-4 w-4 shrink-0" />
              {conference.supplierName}
            </span>
            <span className="shrink-0 text-[var(--border)]" aria-hidden>
              •
            </span>
            <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
              <Clock className="h-4 w-4 shrink-0" />
              {formatDate(conference.issueDate)}
            </span>
            <span className="shrink-0 text-[var(--border)]" aria-hidden>
              •
            </span>
            <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
              Nº {conference.invoiceNumber}
            </span>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="sticky top-0 z-20 shrink-0 space-y-4 border-b border-[var(--border)] bg-[var(--background)] p-4">
          <div className="mx-auto max-w-2xl">
            <input
              type="search"
              placeholder="Buscar produto ou EAN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--foreground)] placeholder-[var(--muted)] transition-colors focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
            />
            <div className="relative mt-4">
              <input
                ref={barcodeInputRef}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                autoFocus
                placeholder="Digite ou escaneie o código"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const value = barcodeInput.trim();
                    if (value) processBarcode(value);
                  }
                }}
                className="w-full rounded-2xl border-2 border-[var(--accent)] bg-[var(--surface)] py-3.5 pl-4 pr-14 text-base font-mono text-[var(--foreground)] placeholder-[var(--muted)] shadow-[0_0_0_1px_var(--accent)] transition-all duration-200 focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              />
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  barcodeInputRef.current?.blur();
                  const value = barcodeInput.trim();
                  if (value) processBarcode(value);
                }}
                disabled={!barcodeInput.trim()}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[var(--accent)] bg-[var(--accent)] text-[var(--primary-foreground)] transition-all duration-200 hover:bg-[var(--accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 disabled:border-[var(--border)] disabled:bg-[var(--surface)] disabled:text-[var(--muted)]"
                aria-label="Confirmar"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </button>
            </div>
            <button
              onClick={() => setCameraEnabled((prev) => !prev)}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] font-medium text-[var(--foreground)] transition-all duration-200 hover:bg-[var(--surface-hover)] active:scale-[0.99]"
            >
              {cameraEnabled ? "Ocultar câmera" : "Escanear com câmera"}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="mx-auto max-w-2xl space-y-4 p-4">
            {cameraEnabled && (
              <div className="overflow-hidden rounded-2xl border-2 border-[var(--border)] shadow-sm">
                <BarcodeScanner onScan={processBarcode} enabled={cameraEnabled} />
              </div>
            )}

            <div className="overflow-hidden rounded-xl border border-[var(--border)]/60 bg-[var(--surface)] transition-all duration-200 hover:border-[var(--border)] hover:shadow-lg">
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 border-b border-[var(--border)]/50 bg-[var(--surface-hover)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                <div>Produto</div>
                <div className="w-14 text-right">Esp.</div>
                <div className="w-14 text-right">Cont.</div>
                <div className="w-20 text-right">+/-</div>
              </div>
              <div className="max-h-[40vh] min-h-[120px] overflow-y-auto overscroll-contain">
                {filteredProducts.length === 0 ? (
                  <div className="px-4 py-8 text-center text-[var(--secondary)]">
                    Escaneie códigos de barras ou digite o código
                  </div>
                ) : (
                  filteredProducts.map(({ product, originalIndex }) => {
                    const diff = product.countedQty - product.expectedQty;
                    const diffClass =
                      diff > 0
                        ? "text-[var(--success)]"
                        : diff < 0
                          ? "text-[var(--destructive)]"
                          : "text-[var(--muted)]";
                    return (
                      <div
                        key={`${product.ean}-${originalIndex}`}
                        className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 border-b border-[var(--border)]/50 px-4 py-3 last:border-0"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-[var(--foreground)]">
                            {product.description}
                          </div>
                          <div className="mt-0.5 font-mono text-xs text-[var(--muted)]">
                            {product.ean}
                          </div>
                        </div>
                        <div className="text-right text-sm font-medium text-[var(--foreground)]">
                          {product.expectedQty}
                        </div>
                        <div className="text-right text-sm font-medium text-[var(--foreground)]">
                          {product.countedQty}
                        </div>
                        <div className="flex items-center justify-end gap-0.5">
                          <button
                            type="button"
                            onClick={() =>
                              updateProduct(originalIndex, {
                                countedQty: Math.max(0, product.countedQty - 1),
                              })
                            }
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-[var(--border)] text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] disabled:opacity-40 disabled:pointer-events-none"
                            disabled={product.countedQty <= 0}
                            aria-label="Diminuir"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span
                            className={`min-w-[2rem] text-center text-sm font-medium ${diffClass}`}
                          >
                            {diff > 0 ? `+${diff}` : diff}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateProduct(originalIndex, {
                                countedQty: product.countedQty + 1,
                              })
                            }
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-[var(--border)] text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
                            aria-label="Aumentar"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
              <Package className="h-5 w-5 text-[var(--muted)]" />
              <span className="text-sm text-[var(--secondary)]">
                {conference.products.length} produtos na NFe
              </span>
            </div>

            <button
              onClick={handleFinish}
              className="flex h-14 w-full items-center justify-center rounded-2xl bg-[var(--primary)] font-semibold text-[var(--primary-foreground)] transition-all duration-200 hover:bg-[var(--primary-hover)] active:scale-[0.98] mb-[env(safe-area-inset-bottom)]"
            >
              Finalizar Conferência
            </button>
          </div>
        </div>
      </main>

      {confirmScan && (
        <ScanConfirmation
          ean={confirmScan.ean}
          quantity={confirmScan.quantity}
          onComplete={() => setConfirmScan(null)}
          productName={conference.products.find((p) => p.ean === confirmScan.ean)?.description}
        />
      )}
    </div>
  );
}
