"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Minus,
  Clock,
  Package,
  FileText,
  Copy,
  AlertTriangle,
  CheckCircle,
  Camera,
  FileDown,
  Trash2,
  Search,
  Link2,
  Link2Off,
} from "lucide-react";
import { getNFeConference, saveNFeConference } from "@/lib/nfe-storage";
import { HiddenBarcodeInput } from "@/components/HiddenBarcodeInput";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { ScanConfirmation } from "@/components/ScanConfirmation";
import { LinkUnlistedScanModal } from "@/components/LinkUnlistedScanModal";
import { ConfirmDeleteDrawer } from "@/components/ConfirmDeleteDrawer";
import { StartConferenceDrawer } from "@/components/StartConferenceDrawer";
import { ObservationField } from "@/components/ObservationField";
import { useAuth } from "@/components/AuthProvider";
import { generateConferencePdf } from "@/lib/generate-conference-pdf";
import { SkeletonDetailPage } from "@/components/Skeleton";
import { NFE_PRODUCT_NOT_ON_INVOICE, type NFeConference, type NFeProduct } from "@/types/nfe";

function findProductIndexByScannedCode(products: NFeProduct[], code: string): number {
  const trimmed = code.trim();
  return products.findIndex(
    (p) =>
      p.ean === trimmed || (Array.isArray(p.linkedScanCodes) && p.linkedScanCodes.includes(trimmed))
  );
}

function productLineForScannedCode(products: NFeProduct[], code: string): NFeProduct | undefined {
  const i = findProductIndexByScannedCode(products, code);
  return i >= 0 ? products[i] : undefined;
}

function withoutLinkedCode(p: NFeProduct, scanned: string): NFeProduct {
  const codes = p.linkedScanCodes?.filter((c) => c !== scanned);
  const counts = p.linkedScanCounts ? { ...p.linkedScanCounts } : {};
  delete counts[scanned];

  if (!codes?.length) {
    const { linkedScanCodes: _lc, linkedScanCounts: _lct, ...rest } = p;
    return rest;
  }

  const next: NFeProduct = { ...p, linkedScanCodes: codes };
  if (Object.keys(counts).length > 0) next.linkedScanCounts = counts;
  else delete next.linkedScanCounts;
  return next;
}

/** Devolve quantidade para linha “Produto não listado na NFe” (cria ou soma). */
function mergeGhostUnlistedRow(products: NFeProduct[], scannedCode: string, addCounted: number) {
  const idx = products.findIndex(
    (x) => x.description === NFE_PRODUCT_NOT_ON_INVOICE && x.ean === scannedCode
  );
  if (idx >= 0) {
    const g = products[idx];
    products[idx] = { ...g, countedQty: g.countedQty + addCounted };
    return;
  }
  products.push({
    ean: scannedCode,
    description: NFE_PRODUCT_NOT_ON_INVOICE,
    expectedQty: 0,
    unitPrice: 0,
    countedQty: Math.max(0, addCounted),
  });
}

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
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);

  const [conference, setConference] = useState<NFeConference | null>(null);
  const [search, setSearch] = useState("");
  const [confirmScan, setConfirmScan] = useState<{ ean: string; quantity: number } | null>(null);
  const [pendingUnlistedScan, setPendingUnlistedScan] = useState<{
    ean: string;
    mergeFromRowIndex?: number;
  } | null>(null);
  const [isScanBlocked, setIsScanBlocked] = useState(false);
  const [decreaseTarget, setDecreaseTarget] = useState<{ originalIndex: number; product: NFeProduct } | null>(null);
  const [deleteProductTarget, setDeleteProductTarget] = useState<{ originalIndex: number; product: NFeProduct } | null>(null);
  const [unlinkTarget, setUnlinkTarget] = useState<{ originalIndex: number; code: string } | null>(null);
  const [showFinishDrawer, setShowFinishDrawer] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [finishDrawerLoading, setFinishDrawerLoading] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [copiedEan, setCopiedEan] = useState<string | null>(null);

  useEffect(() => {
    getNFeConference(id).then((conf) => {
      setConference(conf);
      if (conf && user && user !== "admin" && conf.createdBy !== user) {
        router.replace("/nfe/conferences");
      }
    });
  }, [id, user, router]);

  const filteredProducts = useMemo(() => {
    if (!conference) return [];
    const q = search.trim().toLowerCase();
    return conference.products
      .map((product, originalIndex) => ({ product, originalIndex }))
      .filter(
        ({ product }) =>
          !q ||
          product.description.toLowerCase().includes(q) ||
          product.ean.toLowerCase().includes(q) ||
          product.linkedScanCodes?.some((c) => c.toLowerCase().includes(q))
      );
  }, [conference, search]);

  const linkableRows = useMemo(() => {
    if (!conference) return [];
    return conference.products
      .map((product, originalIndex) => ({ product, originalIndex }))
      .filter(({ product }) => product.description !== NFE_PRODUCT_NOT_ON_INVOICE);
  }, [conference]);

  const processBarcode = useCallback(
    (ean: string) => {
      const trimmed = ean.trim();
      if (
        !trimmed ||
        !conference ||
        isScanBlocked ||
        conference.status === "encerrado" ||
        pendingUnlistedScan
      )
        return;

      const products = [...conference.products];
      const idx = findProductIndexByScannedCode(products, trimmed);

      if (idx >= 0) {
        const prev = products[idx];
        const viaLinked =
          prev.ean !== trimmed && prev.linkedScanCodes?.includes(trimmed) === true;
        if (viaLinked) {
          const nextCounts = { ...(prev.linkedScanCounts ?? {}) };
          nextCounts[trimmed] = (nextCounts[trimmed] ?? 0) + 1;
          products[idx] = {
            ...prev,
            countedQty: prev.countedQty + 1,
            linkedScanCounts: nextCounts,
          };
        } else {
          products[idx] = {
            ...prev,
            countedQty: prev.countedQty + 1,
          };
        }
        const updated = { ...conference, products };
        setConference(updated);
        void saveNFeConference(updated);
        setConfirmScan({ ean: trimmed, quantity: products[idx].countedQty });
        setBarcodeInput("");
        return;
      }

      setPendingUnlistedScan({ ean: trimmed });
      setBarcodeInput("");
    },
    [conference, isScanBlocked, pendingUnlistedScan]
  );

  const handleRegisterUnlistedWithoutLink = useCallback(() => {
    if (!conference || !pendingUnlistedScan) return;
    if (pendingUnlistedScan.mergeFromRowIndex != null) return;
    const trimmed = pendingUnlistedScan.ean;
    const products = [
      ...conference.products,
      {
        ean: trimmed,
        description: NFE_PRODUCT_NOT_ON_INVOICE,
        expectedQty: 0,
        unitPrice: 0,
        countedQty: 1,
      },
    ];
    const updated = { ...conference, products };
    setConference(updated);
    void saveNFeConference(updated);
    setPendingUnlistedScan(null);
    setConfirmScan({ ean: trimmed, quantity: 1 });
  }, [conference, pendingUnlistedScan]);

  const handleLinkUnlistedToRow = useCallback(
    (targetOriginalIndex: number) => {
      if (!conference || !pendingUnlistedScan) return;
      const scannedEan = pendingUnlistedScan.ean;
      const mergeFrom = pendingUnlistedScan.mergeFromRowIndex;

      const products: NFeProduct[] = conference.products.map((p) => {
        const copy: NFeProduct = { ...p };
        if (p.linkedScanCodes?.length) copy.linkedScanCodes = [...p.linkedScanCodes];
        if (p.linkedScanCounts && Object.keys(p.linkedScanCounts).length) {
          copy.linkedScanCounts = { ...p.linkedScanCounts };
        }
        return copy;
      });

      for (let i = 0; i < products.length; i++) {
        if (!products[i].linkedScanCodes?.includes(scannedEan)) continue;
        products[i] = withoutLinkedCode(products[i], scannedEan);
      }

      let addQty = 1;
      let targetIdx = targetOriginalIndex;
      let working = products;

      if (mergeFrom !== undefined) {
        const ghost = products[mergeFrom];
        if (!ghost || ghost.ean !== scannedEan) return;
        addQty = Math.max(0, ghost.countedQty);
        working = products.filter((_, i) => i !== mergeFrom);
        targetIdx = targetOriginalIndex > mergeFrom ? targetOriginalIndex - 1 : targetOriginalIndex;
      }

      const target = working[targetIdx];
      if (!target) return;

      const mergedCounts = { ...(target.linkedScanCounts ?? {}) };
      mergedCounts[scannedEan] = (mergedCounts[scannedEan] ?? 0) + addQty;

      working[targetIdx] = {
        ...target,
        linkedScanCodes: [...new Set([...(target.linkedScanCodes ?? []), scannedEan])],
        countedQty: target.countedQty + addQty,
        linkedScanCounts: mergedCounts,
      };

      const updated = { ...conference, products: working };
      setConference(updated);
      void saveNFeConference(updated);
      setPendingUnlistedScan(null);
      setConfirmScan({ ean: scannedEan, quantity: working[targetIdx].countedQty });
    },
    [conference, pendingUnlistedScan]
  );

  const isReadOnly = conference?.status === "encerrado";

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
    if (conference?.startedBy?.trim()) {
      setShowFinishModal(true);
    } else {
      setShowFinishDrawer(true);
    }
  }, [conference?.startedBy]);

  const handleFinishDrawerConfirm = useCallback(
    async (employeeName: string) => {
      if (!conference) return;
      setFinishDrawerLoading(true);
      try {
        const updated = { ...conference, startedBy: employeeName.trim() };
        setConference(updated);
        await saveNFeConference(updated);
        setShowFinishDrawer(false);
        setShowFinishModal(true);
      } finally {
        setFinishDrawerLoading(false);
      }
    },
    [conference]
  );

  const handleCloseFinishModal = useCallback(async () => {
    setShowFinishModal(false);
    if (conference) {
      const updated = { ...conference, status: "concluida" as const };
      await saveNFeConference(updated);
    }
    router.push("/nfe/conferences");
  }, [router, conference]);

  const focusBarcodeInput = useCallback(() => {
    setTimeout(() => barcodeInputRef.current?.focus(), 100);
  }, []);

  const handleCancelUnlistedModal = useCallback(() => {
    setPendingUnlistedScan(null);
    focusBarcodeInput();
  }, [focusBarcodeInput]);

  const handleConfirmUnlink = useCallback(() => {
    if (!conference || !unlinkTarget) return;
    const { originalIndex, code } = unlinkTarget;
    const products = [...conference.products];
    const p = products[originalIndex];
    if (!p?.linkedScanCodes?.includes(code)) {
      setUnlinkTarget(null);
      focusBarcodeInput();
      return;
    }
    const n = p.linkedScanCounts?.[code] ?? 0;
    const stripped = withoutLinkedCode(p, code);
    products[originalIndex] = {
      ...stripped,
      countedQty: Math.max(0, p.countedQty - n),
    };
    mergeGhostUnlistedRow(products, code, n);
    const updated = { ...conference, products };
    setConference(updated);
    void saveNFeConference(updated);
    setUnlinkTarget(null);
    focusBarcodeInput();
  }, [conference, unlinkTarget, focusBarcodeInput]);

  const lastFocusedConferenceIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (conference && lastFocusedConferenceIdRef.current !== id) {
      lastFocusedConferenceIdRef.current = id;
      focusBarcodeInput();
    }
  }, [id, conference, focusBarcodeInput]);

  useEffect(() => {
    if (!showSearch) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        searchContainerRef.current?.contains(target) ||
        searchButtonRef.current?.contains(target)
      )
        return;
      if (!search.trim()) setShowSearch(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSearch, search]);

  if (!conference) {
    return <SkeletonDetailPage />;
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--background)]">
      {!isReadOnly && <HiddenBarcodeInput onScan={processBarcode} />}

      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/95 pt-[env(safe-area-inset-top)] backdrop-blur-sm">
        <div className="mx-auto max-w-2xl px-4 py-4 pr-20">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <Link
              href="/nfe/conferences"
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
          {isReadOnly && (
            <div className="mx-auto max-w-2xl rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] px-4 py-3 text-center text-sm text-[var(--secondary)]">
              Conferência encerrada — somente visualização
            </div>
          )}
          <div className="mx-auto max-w-2xl">
            <div className="relative">
              <input
                ref={barcodeInputRef}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                autoFocus={!isReadOnly}
                placeholder={isReadOnly ? "Conferência encerrada" : "Digite ou escaneie o código"}
                disabled={isReadOnly}
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
                  if (isReadOnly) return;
                  barcodeInputRef.current?.blur();
                  const value = barcodeInput.trim();
                  if (value) processBarcode(value);
                }}
                disabled={!barcodeInput.trim() || isReadOnly}
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
            {showSearch && (
              <div ref={searchContainerRef} className="mt-4">
                <input
                  type="search"
                  placeholder="Buscar produto ou EAN..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                  className="w-full rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--foreground)] placeholder-[var(--muted)] transition-colors focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                />
              </div>
            )}
            <div className="mt-4 flex items-center gap-3">
              <button
                ref={searchButtonRef}
                onClick={() => !isReadOnly && setShowSearch((prev) => !prev)}
                disabled={isReadOnly}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 transition-all duration-200 active:scale-[0.98] ${
                  showSearch
                    ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
                }`}
                aria-label={showSearch ? "Ocultar busca" : "Buscar produto ou EAN"}
              >
                <Search className="h-5 w-5" />
              </button>
              <button
                onClick={() => !isReadOnly && setCameraEnabled((prev) => !prev)}
                disabled={isReadOnly}
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
                onClick={() => generateConferencePdf(conference).catch(console.error)}
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
            {cameraEnabled && !isReadOnly && (
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
                            <span className="mt-1 flex flex-col gap-1">
                              <span className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(product.ean);
                                    setCopiedEan(product.ean);
                                    setTimeout(() => setCopiedEan(null), 2000);
                                  }}
                                  className="flex items-center gap-1.5 font-mono text-[13px] text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
                                  title={copiedEan === product.ean ? "Copiado" : "Copiar EAN"}
                                >
                                  {product.ean}
                                  <Copy className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
                                </button>
                                {copiedEan === product.ean && (
                                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400" title="Copiado">
                                    Copiado
                                  </span>
                                )}
                              </span>
                              {product.linkedScanCodes && product.linkedScanCodes.length > 0 && (
                                <span className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs">
                                  <span className="shrink-0 font-medium text-[var(--muted)]">Vinculados:</span>
                                  {product.linkedScanCodes.map((code) => (
                                    <span
                                      key={code}
                                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--accent)]/35 bg-[var(--accent)]/10 px-2 py-0.5 font-mono text-[11px] text-[var(--accent)]"
                                    >
                                      <span className="max-w-[140px] truncate sm:max-w-[200px]" title={code}>
                                        {code}
                                      </span>
                                      {!isReadOnly && (
                                        <button
                                          type="button"
                                          onClick={() => setUnlinkTarget({ originalIndex, code })}
                                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--accent)] transition-colors hover:bg-[var(--destructive)]/15 hover:text-[var(--destructive)]"
                                          title="Remover vínculo"
                                          aria-label={`Remover vínculo do código ${code}`}
                                        >
                                          <Link2Off className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                    </span>
                                  ))}
                                </span>
                              )}
                            </span>
                          </div>
                          {!isReadOnly && (
                            <div className="flex shrink-0 items-center gap-1">
                              {product.description === NFE_PRODUCT_NOT_ON_INVOICE && (
                                <button
                                  type="button"
                                  disabled={linkableRows.length === 0}
                                  onClick={() =>
                                    linkableRows.length > 0 &&
                                    setPendingUnlistedScan({
                                      ean: product.ean,
                                      mergeFromRowIndex: originalIndex,
                                    })
                                  }
                                  className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-[var(--accent)]/50 bg-[var(--accent)]/10 text-[var(--accent)] transition-colors hover:bg-[var(--accent)]/20 disabled:cursor-not-allowed disabled:opacity-40"
                                  title={
                                    linkableRows.length === 0
                                      ? "Não há itens da NFe na conferência para vincular"
                                      : "Vincular a um item da NFe"
                                  }
                                  aria-label="Vincular a um item da NFe"
                                >
                                  <Link2 className="h-4 w-4" />
                                </button>
                              )}
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
                          )}
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
                const updated = { ...conference, observation: val.trim() ? val : undefined };
                setConference(updated);
                void saveNFeConference(updated);
              }}
              readOnly={isReadOnly}
            />

            {!isReadOnly && (
              <button
                onClick={handleFinish}
                className="flex h-14 w-full items-center justify-center rounded-2xl bg-[var(--primary)] font-semibold text-[var(--primary-foreground)] transition-all duration-200 hover:bg-[var(--primary-hover)] active:scale-[0.98] mb-[env(safe-area-inset-bottom)]"
              >
                Finalizar Conferência
              </button>
            )}
          </div>
        </div>
      </main>

      {pendingUnlistedScan && conference && (
        <LinkUnlistedScanModal
          open
          ean={pendingUnlistedScan.ean}
          linkableRows={linkableRows}
          onCancel={handleCancelUnlistedModal}
          onRegisterWithoutLink={handleRegisterUnlistedWithoutLink}
          onLinkToRow={handleLinkUnlistedToRow}
          mergeFromExistingRow={pendingUnlistedScan.mergeFromRowIndex != null}
          mergeCountedQty={
            pendingUnlistedScan.mergeFromRowIndex != null
              ? conference.products[pendingUnlistedScan.mergeFromRowIndex]?.countedQty
              : undefined
          }
          initialStep={pendingUnlistedScan.mergeFromRowIndex != null ? "pick" : "choice"}
        />
      )}

      {confirmScan && (
        <ScanConfirmation
          ean={confirmScan.ean}
          quantity={confirmScan.quantity}
          onComplete={() => {
            setIsScanBlocked(false);
            setConfirmScan(null);
            focusBarcodeInput();
          }}
          onBlockingChange={setIsScanBlocked}
          productName={productLineForScannedCode(conference.products, confirmScan.ean)?.description}
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

      <ConfirmDeleteDrawer
        isOpen={!!unlinkTarget}
        onClose={() => {
          setUnlinkTarget(null);
          focusBarcodeInput();
        }}
        onConfirm={handleConfirmUnlink}
        title="Remover vínculo?"
        message={
          unlinkTarget && conference
            ? (() => {
                const p = conference.products[unlinkTarget.originalIndex];
                const n = p?.linkedScanCounts?.[unlinkTarget.code] ?? 0;
                const head = `O código ${unlinkTarget.code} deixará de contar neste item da NFe.`;
                if (n > 0) {
                  return `${head} Serão subtraídas ${n} unidade(s) do conferido e recolocadas na linha "${NFE_PRODUCT_NOT_ON_INVOICE}".`;
                }
                return `${head} Voltará a linha "${NFE_PRODUCT_NOT_ON_INVOICE}" com conferido 0 (sem histórico de quantidade por vínculo).`;
              })()
            : undefined
        }
        confirmLabel="Remover vínculo"
        loadingLabel="Removendo..."
      />

      <StartConferenceDrawer
        isOpen={showFinishDrawer}
        onClose={() => setShowFinishDrawer(false)}
        onConfirm={handleFinishDrawerConfirm}
        isLoading={finishDrawerLoading}
        createdBy={user}
        confirmLabel="Confirmar e Finalizar"
        loadingLabel="Finalizando..."
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
