"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Minus, Clock, Package, FileText, Copy, AlertTriangle, CheckCircle, Camera, FileDown, Trash2 } from "lucide-react";
import { getNFeConference, saveNFeConference } from "@/lib/nfe-storage";
import { HiddenBarcodeInput } from "@/components/HiddenBarcodeInput";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { ScanConfirmation } from "@/components/ScanConfirmation";
import { ConfirmDeleteDrawer } from "@/components/ConfirmDeleteDrawer";
import { ObservationField } from "@/components/ObservationField";
import { useAuth } from "@/components/AuthProvider";
import { generateConferencePdf } from "@/lib/generate-conference-pdf";
import { SkeletonDetailPage } from "@/components/Skeleton";
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
  const { user } = useAuth();
  const id = params.id as string;
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const [conference, setConference] = useState<NFeConference | null>(null);
  const [search, setSearch] = useState("");
  const [confirmScan, setConfirmScan] = useState<{ ean: string; quantity: number } | null>(null);
  const [decreaseTarget, setDecreaseTarget] = useState<{ originalIndex: number; product: NFeProduct } | null>(null);
  const [deleteProductTarget, setDeleteProductTarget] = useState<{ originalIndex: number; product: NFeProduct } | null>(null);
  const [showFinishModal, setShowFinishModal] = useState(false);
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

  const removeProduct = useCallback(
    (index: number) => {
      if (!conference) return;
      const products = conference.products.filter((_, i) => i !== index);
      const updated = { ...conference, products };
      setConference(updated);
      void saveNFeConference(updated);
    },
    [conference]
  );

  const divergences = useMemo(() => {
    if (!conference) return [];
    return conference.products.filter((p) => p.countedQty !== p.expectedQty);
  }, [conference]);

  const handleFinish = useCallback(() => {
    setShowFinishModal(true);
  }, []);

  const handleCloseFinishModal = useCallback(() => {
    setShowFinishModal(false);
    router.push("/nfe/conferences");
  }, [router]);

  const focusBarcodeInput = useCallback(() => {
    setTimeout(() => barcodeInputRef.current?.focus(), 100);
  }, []);

  useEffect(() => {
    if (conference) focusBarcodeInput();
  }, [conference, focusBarcodeInput]);

  if (!conference) {
    return <SkeletonDetailPage />;
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
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={() => setCameraEnabled((prev) => !prev)}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 transition-all duration-200 active:scale-[0.98] ${
                  cameraEnabled
                    ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
                }`}
                aria-label={cameraEnabled ? "Ocultar câmera" : "Escanear com câmera"}
              >
                <Camera className="h-5 w-5" />
              </button>
              <button
                onClick={() => generateConferencePdf(conference)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] transition-all duration-200 hover:bg-[var(--surface-hover)] active:scale-[0.98]"
                aria-label="Gerar PDF"
                title="Gerar PDF"
              >
                <FileDown className="h-5 w-5" />
              </button>
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                <Package className="h-5 w-5 shrink-0 text-[var(--muted)]" />
                <span className="text-sm text-[var(--secondary)]">
                  <span className="font-medium text-[var(--foreground)]">{conference.products.length}</span> produtos
                  {" · "}
                  <span className="font-medium text-[var(--foreground)]">
                    {conference.products.reduce((s, p) => s + p.countedQty, 0)}/
                    {conference.products.filter((p) => p.expectedQty > 0).reduce((s, p) => s + p.expectedQty, 0)}
                  </span>{" "}
                  itens contados
                </span>
              </div>
            </div>
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
              <div className="max-h-[40vh] min-h-[120px] overflow-y-auto overscroll-contain">
                {filteredProducts.length === 0 ? (
                  <div className="px-4 py-8 text-center text-[var(--secondary)]">
                    Escaneie códigos de barras ou digite o código
                  </div>
                ) : (
                  filteredProducts.map(({ product, originalIndex }) => {
                    const diff = product.countedQty - product.expectedQty;
                    const diffBgClass =
                      diff < 0 ? "bg-red-500/10" : diff > 0 ? "bg-amber-500/10" : "bg-emerald-500/10";
                    const diffClass =
                      diff === 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : diff > 0
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-red-600 dark:text-red-400";
                    return (
                      <div
                        key={`${product.ean}-${originalIndex}`}
                        className={`border-b border-[var(--border)]/50 px-4 py-4 last:border-0 ${diffBgClass}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium leading-snug text-[var(--foreground)]">
                              {product.description}
                            </p>
                            <button
                              type="button"
                              onClick={() => navigator.clipboard.writeText(product.ean)}
                              className="mt-1 flex items-center gap-1.5 font-mono text-xs text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
                              title="Copiar EAN"
                            >
                              {product.ean}
                              <Copy className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
                            </button>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                product.countedQty > 0 &&
                                setDecreaseTarget({ originalIndex, product })
                              }
                              className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-[var(--border)] text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] disabled:opacity-40 disabled:pointer-events-none"
                              disabled={product.countedQty <= 0}
                              aria-label="Diminuir quantidade"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            {user === "admin" && (
                              <button
                                type="button"
                                onClick={() => setDeleteProductTarget({ originalIndex, product })}
                                className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-[var(--border)] text-[var(--muted)] transition-colors hover:bg-[var(--destructive)]/10 hover:text-[var(--destructive)]"
                                aria-label="Excluir produto"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                          <span className="text-[var(--muted)]">
                            Esperado: <strong className="font-semibold text-[var(--foreground)]">{product.expectedQty}</strong>
                          </span>
                          <span className="text-[var(--muted)]">
                            Conferido: <strong className="font-semibold text-[var(--foreground)]">{product.countedQty}</strong>
                          </span>
                          <span className={diffClass}>
                            Diferença: <strong>{diff > 0 ? `+${diff}` : diff}</strong>
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <ObservationField
              value={conference.observation ?? ""}
              onChange={(val) => {
                const updated = { ...conference, observation: val.trim() || undefined };
                setConference(updated);
                void saveNFeConference(updated);
              }}
            />

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
          onComplete={() => {
            setConfirmScan(null);
            focusBarcodeInput();
          }}
          productName={conference.products.find((p) => p.ean === confirmScan.ean)?.description}
        />
      )}

      <ConfirmDeleteDrawer
        isOpen={!!decreaseTarget}
        onClose={() => {
          setDecreaseTarget(null);
          focusBarcodeInput();
        }}
        onConfirm={() => {
          if (decreaseTarget) {
            updateProduct(decreaseTarget.originalIndex, {
              countedQty: Math.max(0, decreaseTarget.product.countedQty - 1),
            });
          }
        }}
        title="Remover 1 unidade?"
        message={
          decreaseTarget
            ? `"${decreaseTarget.product.description}" — Confirma a remoção desta unidade da conferência?`
            : undefined
        }
        confirmLabel="Remover"
        loadingLabel="Removendo..."
      />

      <ConfirmDeleteDrawer
        isOpen={!!deleteProductTarget}
        onClose={() => {
          setDeleteProductTarget(null);
          focusBarcodeInput();
        }}
        onConfirm={() => {
          if (deleteProductTarget) {
            removeProduct(deleteProductTarget.originalIndex);
          }
        }}
        title="Excluir produto da conferência?"
        message={
          deleteProductTarget
            ? `"${deleteProductTarget.product.description}" (${deleteProductTarget.product.ean}) — O produto será removido da lista.`
            : undefined
        }
        confirmLabel="Excluir"
        loadingLabel="Excluindo..."
      />

      {showFinishModal && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div
            onClick={handleCloseFinishModal}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="relative max-h-[85vh] overflow-hidden rounded-t-3xl border-t-2 border-x-2 border-[var(--border)] bg-[var(--surface)] p-6 pb-8 shadow-2xl">
            <div className="absolute left-1/2 top-3 h-1 w-12 -translate-x-1/2 rounded-full bg-[var(--muted)]" />
            <div className="mt-4 flex items-center gap-2">
              {divergences.length > 0 ? (
                <AlertTriangle className="h-6 w-6 shrink-0 text-[var(--destructive)]" />
              ) : (
                <CheckCircle className="h-6 w-6 shrink-0 text-[var(--success)]" />
              )}
              <h2 className="text-xl font-semibold text-[var(--foreground)]">
                {divergences.length > 0 ? "Divergências na conferência" : "Conferência concluída"}
              </h2>
            </div>
            <p className="mt-2 text-sm text-[var(--secondary)]">
              {divergences.length > 0
                ? `${divergences.length} produto(s) com diferença entre esperado e conferido:`
                : "Todos os produtos foram conferidos corretamente."}
            </p>
            {divergences.length > 0 && (
              <div className="mt-4 max-h-[50vh] overflow-y-auto space-y-3">
                {divergences.map((p, idx) => {
                  const diff = p.countedQty - p.expectedQty;
                  const diffClass = diff > 0 ? "text-[var(--accent)]" : "text-[var(--destructive)]";
                  return (
                    <div
                      key={`${p.ean}-${idx}`}
                      className="rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] p-3"
                    >
                      <p className="text-sm font-medium text-[var(--foreground)]">{p.description}</p>
                      <p className="mt-0.5 font-mono text-xs text-[var(--muted)]">{p.ean}</p>
                      <p className="mt-2 text-sm">
                        <span className="text-[var(--muted)]">Esperado: {p.expectedQty}</span>
                        {" · "}
                        <span className="text-[var(--muted)]">Conferido: {p.countedQty}</span>
                        {" · "}
                        <span className={diffClass}>
                          Diferença: {diff > 0 ? `+${diff}` : diff}
                        </span>
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowFinishModal(false)}
                className="flex-1 flex h-14 items-center justify-center rounded-2xl border-2 border-[var(--border)] font-semibold text-[var(--foreground)] transition-all duration-200 hover:bg-[var(--surface-hover)] active:scale-[0.98]"
              >
                Voltar
              </button>
              <button
                onClick={handleCloseFinishModal}
                className="flex-1 flex h-14 items-center justify-center rounded-2xl bg-[var(--primary)] font-semibold text-[var(--primary-foreground)] transition-all duration-200 hover:bg-[var(--primary-hover)] active:scale-[0.98]"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
