"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Minus, Plus, Clock, Package, Box, MessageSquare } from "lucide-react";
import { getInventory, saveInventory } from "@/lib/storage";
import type { InventoryStatus } from "@/types/inventory";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

const statusLabel: Record<InventoryStatus, string> = {
  em_contagem: "Em contagem",
  finalizado: "Finalizado",
  importado: "Importado",
};

const statusConfig: Record<InventoryStatus, { className: string }> = {
  importado: {
    className: "bg-[var(--success)]/15 text-[var(--success)] border-[var(--success)]/30",
  },
  em_contagem: {
    className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  },
  finalizado: {
    className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  },
};
import { getProdutoByCodigo, getProdutosByCodigos } from "@/lib/produtos";
import { HiddenBarcodeInput } from "@/components/HiddenBarcodeInput";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { ScanConfirmation } from "@/components/ScanConfirmation";
import { SkeletonDetailPage } from "@/components/Skeleton";
import type { Inventory, InventoryItem } from "@/types/inventory";

export default function InventoryScanPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [search, setSearch] = useState("");
  const [confirmScan, setConfirmScan] = useState<{ ean: string; quantity: number } | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [produtoNames, setProdutoNames] = useState<Map<string, string>>(new Map());
  const [typingProdutoHint, setTypingProdutoHint] = useState<string | null>(null);
  const [expandedCodesKey, setExpandedCodesKey] = useState<string | null>(null);

  useEffect(() => {
    getInventory(id).then(setInventory);
  }, [id]);

  const totalItems = useMemo(
    () => inventory?.items.reduce((s, i) => s + i.quantity, 0) ?? 0,
    [inventory]
  );

  /** Agrupa por nome exato do produto e unifica quantidade */
  const mergedItems = useMemo(() => {
    if (!inventory) return [];
    const withFilter = !search.trim()
      ? inventory.items.map((item, idx) => ({ item, idx }))
      : (() => {
          const q = search.trim().toLowerCase();
          return inventory.items
            .map((item, idx) => ({ item, idx }))
            .filter(({ item }) => {
              const nome = produtoNames.get(item.ean)?.toLowerCase() ?? "";
              return item.ean.toLowerCase().includes(q) || nome.includes(q);
            });
        })();

    const byName = new Map<string, { item: InventoryItem; idx: number }[]>();
    for (const { item, idx } of withFilter) {
      const key = produtoNames.get(item.ean) || item.ean;
      const group = byName.get(key) ?? [];
      group.push({ item, idx });
      byName.set(key, group);
    }

    return Array.from(byName.entries()).map(([groupKey, group]) => {
      const firstEan = group[0].item.ean;
      const nome = produtoNames.get(firstEan);
      const displayLabel = nome?.trim() || "NÃO CADASTRADO";
      return {
        groupKey,
        displayLabel,
        items: group,
        totalQty: group.reduce((s, g) => s + g.item.quantity, 0),
      };
    });
  }, [inventory, search, produtoNames]);

  const processBarcode = useCallback(
    async (ean: string) => {
      const trimmed = ean.trim();
      if (!trimmed || !inventory) return;

      const items = [...inventory.items];
      let idx = items.findIndex((i) => i.ean === trimmed);

      if (idx >= 0) {
        const item = { ...items[idx], quantity: items[idx].quantity + 1 };
        items.splice(idx, 1);
        items.unshift(item);
      } else {
        const produto = await getProdutoByCodigo(trimmed);
        const novoNome = produto?.produto ?? null;
        const idxMesmoNome = novoNome
          ? items.findIndex((i) => produtoNames.get(i.ean) === novoNome)
          : -1;

        if (idxMesmoNome >= 0) {
          items.unshift({ ean: trimmed, quantity: 1 });
          if (novoNome) {
            setProdutoNames((prev) => new Map(prev).set(trimmed, novoNome));
          }
        } else {
          items.unshift({ ean: trimmed, quantity: 1 });
        }
      }

      const updated = { ...inventory, items };
      setInventory(updated);
      void saveInventory(updated);
      const firstItem = items[0];
      const totalQty = firstItem.ean === trimmed
        ? firstItem.quantity
        : items.filter((i) => (produtoNames.get(i.ean) || i.ean) === (produtoNames.get(firstItem.ean) || firstItem.ean)).reduce((s, i) => s + i.quantity, 0);
      setConfirmScan({ ean: trimmed, quantity: totalQty });
      setBarcodeInput("");
    },
    [inventory, produtoNames]
  );

  const updateItem = useCallback(
    (index: number, updates: Partial<InventoryItem>) => {
      if (!inventory) return;
      let items = [...inventory.items];
      if (updates.quantity === 0) {
        items.splice(index, 1);
      } else if (updates.ean !== undefined) {
        const newEan = updates.ean.trim();
        const existingIdx = items.findIndex((i, j) => j !== index && i.ean === newEan);
        if (existingIdx >= 0) {
          items[existingIdx].quantity += items[index].quantity;
          items.splice(index, 1);
        } else {
          items[index] = { ...items[index], ean: newEan };
        }
      } else {
        items[index] = { ...items[index], ...updates };
      }
      const updated = { ...inventory, items };
      setInventory(updated);
      void saveInventory(updated);
    },
    [inventory]
  );

  /** Atualiza um grupo unificado (mesmo nome, códigos diferentes) */
  const updateMergedGroup = useCallback(
    (groupKey: string, newQuantity: number) => {
      if (!inventory) return;
      const items = [...inventory.items];
      const indicesToUpdate = items
        .map((item, idx) => ({ item, idx }))
        .filter(({ item }) => (produtoNames.get(item.ean) || item.ean) === groupKey)
        .map(({ idx }) => idx)
        .sort((a, b) => a - b);

      if (indicesToUpdate.length === 0) return;

      if (newQuantity <= 0) {
        indicesToUpdate.reverse().forEach((i) => items.splice(i, 1));
      } else {
        items[indicesToUpdate[0]] = { ...items[indicesToUpdate[0]], quantity: newQuantity };
        indicesToUpdate.slice(1).reverse().forEach((i) => items.splice(i, 1));
      }
      const updated = { ...inventory, items };
      setInventory(updated);
      void saveInventory(updated);
    },
    [inventory, produtoNames]
  );

  const handleEndInventory = useCallback(async () => {
    if (inventory) {
      const updated = { ...inventory, status: "finalizado" as const };
      await saveInventory(updated);
      router.push("/inventories");
    }
  }, [inventory, router]);

  useEffect(() => {
    if (inventory) {
      barcodeInputRef.current?.focus();
    }
  }, [inventory]);

  // Carrega nomes dos produtos da tabela public.produtos
  useEffect(() => {
    if (!inventory?.items.length) return;
    const codigos = [...new Set(inventory.items.map((i) => i.ean.trim()).filter(Boolean))];
    if (codigos.length === 0) return;
    getProdutosByCodigos(codigos).then(setProdutoNames);
  }, [inventory?.items]);

  // Ao digitar o código, busca o nome do produto
  useEffect(() => {
    const code = barcodeInput.trim();
    if (!code || code.length < 4) {
      setTypingProdutoHint(null);
      return;
    }
    const t = setTimeout(() => {
      getProdutoByCodigo(code).then((p) => setTypingProdutoHint(p?.produto ?? null));
    }, 300);
    return () => clearTimeout(t);
  }, [barcodeInput]);

  if (!inventory) {
    return <SkeletonDetailPage />;
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--background)]">
      <HiddenBarcodeInput onScan={processBarcode} />

      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/95 pt-[env(safe-area-inset-top)] backdrop-blur-sm">
        <div className="mx-auto max-w-2xl px-4 py-4 pr-20">
          {/* Linha 1: Voltar | Nome | Status */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <Link
              href="/inventories"
              className="flex w-fit items-center gap-1.5 text-[var(--secondary)] transition-colors hover:text-[var(--foreground)]"
            >
              <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Voltar</span>
            </Link>
            <h1 className="min-w-0 truncate text-center text-xl font-semibold text-[var(--foreground)]">
              {inventory.name}
            </h1>
            <div className="flex justify-end">
              <span
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${statusConfig[inventory.status ?? "em_contagem"].className}`}
              >
                {statusLabel[inventory.status ?? "em_contagem"]}
              </span>
            </div>
          </div>

          {/* Linha 2: Data e resumo - estende para evitar corte do "itens" */}
          <div className="-mx-4 mt-3 flex flex-nowrap items-center gap-x-3 overflow-x-auto px-4 pb-1 pr-24 text-sm text-[var(--muted)] [&::-webkit-scrollbar]:hidden">
            <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
              <Clock className="h-4 w-4 shrink-0" />
              {formatDate(inventory.createdAt)}
            </span>
            <span className="shrink-0 text-[var(--border)]" aria-hidden>•</span>
            <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
              <Package className="h-4 w-4 shrink-0" />
              <span className="font-medium text-[var(--foreground)]">{mergedItems.length}</span>
              <span>produtos</span>
            </span>
            <span className="shrink-0 text-[var(--border)]" aria-hidden>•</span>
            <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
              <Box className="h-4 w-4 shrink-0" />
              <span className="font-medium text-[var(--foreground)]">{totalItems}</span>
              <span>itens</span>
            </span>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="sticky top-0 z-20 shrink-0 space-y-4 border-b border-[var(--border)] bg-[var(--background)] p-4">
          <div className="mx-auto max-w-2xl">
            <input
              type="search"
              placeholder="Buscar produto ou código..."
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
                    if (value) {
                      processBarcode(value);
                    }
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
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </button>
            </div>
            {typingProdutoHint && (
              <p className="mt-2 text-sm text-[var(--secondary)]">
                {typingProdutoHint}
              </p>
            )}

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
            <div className="grid grid-cols-[1fr_auto] gap-2 border-b border-[var(--border)]/50 bg-[var(--surface-hover)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              <div>Produto</div>
              <div className="w-20 text-right">QTD</div>
            </div>
            <div className="max-h-[40vh] min-h-[120px] overflow-y-auto overscroll-contain">
              {mergedItems.length === 0 ? (
                <div className="px-4 py-8 text-center text-[var(--secondary)]">
                  Escaneie códigos de barras ou digite o código
                </div>
              ) : (
                mergedItems.map(({ groupKey, displayLabel, items, totalQty }) => {
                  const codigos = items.map((g) => g.item.ean).join(", ");
                  return (
                    <div
                      key={groupKey}
                      className="grid grid-cols-[1fr_auto] items-center gap-2 border-b border-[var(--border)]/50 px-4 py-3 last:border-0"
                    >
                      <div className="min-w-0 overflow-visible">
                        <div
                          className={`text-sm font-medium ${
                            displayLabel === "NÃO CADASTRADO"
                              ? "text-[var(--destructive)]"
                              : "text-[var(--foreground)]"
                          }`}
                        >
                          {displayLabel}
                        </div>
                        {displayLabel === "NÃO CADASTRADO" && (
                          <div className="mt-0.5 font-mono text-xs text-[var(--muted)]">
                            {items.map((g) => g.item.ean).join(", ")}
                          </div>
                        )}
                        {displayLabel !== "NÃO CADASTRADO" && (
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex shrink-0 items-center rounded-lg border border-[var(--border)] bg-[var(--surface-hover)] px-2 py-0.5 font-mono text-xs font-medium text-[var(--foreground)]">
                              {items.length} {items.length === 1 ? "código" : "códigos"}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setExpandedCodesKey(expandedCodesKey === groupKey ? null : groupKey);
                              }}
                              className="inline-flex shrink-0 touch-manipulation items-center gap-0.5 rounded-lg border-2 border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 font-mono text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] active:bg-[var(--surface-hover)]"
                            >
                              {expandedCodesKey === groupKey ? (
                                <>
                                  Ocultar
                                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                  </svg>
                                </>
                              ) : (
                                <>
                                  Ver códigos
                                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </>
                              )}
                            </button>
                            {expandedCodesKey === groupKey && (
                              <div className="mt-1 w-full rounded-lg bg-[var(--surface-hover)] px-2 py-1.5 font-mono text-xs text-[var(--muted)]">
                                {items.map((g) => g.item.ean).join(", ")}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() =>
                            updateMergedGroup(groupKey, Math.max(0, totalQty - 1))
                          }
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-[var(--border)] text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] disabled:opacity-40 disabled:pointer-events-none"
                          disabled={totalQty <= 0}
                          aria-label="Diminuir quantidade"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <input
                          type="number"
                          min={0}
                          value={totalQty}
                          onChange={(e) =>
                            updateMergedGroup(
                              groupKey,
                              Math.max(0, parseInt(e.target.value, 10) || 0)
                            )
                          }
                          className="h-8 w-12 rounded-lg border-2 border-[var(--border)] bg-[var(--surface)] text-center text-sm font-medium text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => updateMergedGroup(groupKey, totalQty + 1)}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-[var(--border)] text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
                          aria-label="Aumentar quantidade"
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

          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
            <label className="flex items-center gap-2 text-sm font-medium text-[var(--muted)] mb-2">
              <MessageSquare className="h-4 w-4" />
              Observação
            </label>
            <textarea
              value={inventory.observation ?? ""}
              onChange={(e) => {
                const updated = { ...inventory, observation: e.target.value.trim() || undefined };
                setInventory(updated);
                void saveInventory(updated);
              }}
              placeholder="Adicione uma observação..."
              rows={2}
              className="w-full rounded-lg border-2 border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted)] transition-colors focus:border-[var(--accent)] focus:outline-none resize-none"
            />
          </div>

          <button
            onClick={handleEndInventory}
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-[var(--primary)] font-semibold text-[var(--primary-foreground)] transition-all duration-200 hover:bg-[var(--primary-hover)] active:scale-[0.98] mb-[env(safe-area-inset-bottom)]"
          >
            Encerrar Inventário
          </button>
          </div>
        </div>
      </main>

      {confirmScan && (
        <ScanConfirmation
          ean={confirmScan.ean}
          quantity={confirmScan.quantity}
          onComplete={() => setConfirmScan(null)}
        />
      )}
    </div>
  );
}
