"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { getInventory, saveInventory } from "@/lib/storage";
import { getProdutoByCodigo, getProdutosByCodigos } from "@/lib/produtos";
import { HiddenBarcodeInput } from "@/components/HiddenBarcodeInput";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { ScanConfirmation } from "@/components/ScanConfirmation";
import { playScanSound } from "@/lib/scan-sound";
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

    return Array.from(byName.entries()).map(([groupKey, group]) => ({
      groupKey,
      items: group,
      totalQty: group.reduce((s, g) => s + g.item.quantity, 0),
    }));
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
          items[idxMesmoNome] = { ...items[idxMesmoNome], quantity: items[idxMesmoNome].quantity + 1 };
          const moved = items.splice(idxMesmoNome, 1)[0];
          items.unshift(moved);
        } else {
          items.unshift({ ean: trimmed, quantity: 1 });
        }
      }

      const updated = { ...inventory, items };
      setInventory(updated);
      void saveInventory(updated);
      playScanSound();
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
      await saveInventory(inventory);
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
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-[var(--secondary)]">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--background)]">
      <HiddenBarcodeInput onScan={processBarcode} />

      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-sm">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <h1 className="truncate text-lg font-semibold text-[var(--foreground)]">
            {inventory.name}
          </h1>
          <div className="mt-1 flex gap-4 text-sm font-medium text-[var(--secondary)]">
            <span>{mergedItems.length} produtos</span>
            <span>{totalItems} itens</span>
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

            <input
              ref={barcodeInputRef}
              type="text"
              inputMode="numeric"
              autoComplete="off"
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
              className="mt-4 w-full rounded-2xl border-2 border-[var(--accent)] bg-[var(--surface)] px-4 py-3.5 text-base font-mono text-[var(--foreground)] placeholder-[var(--muted)] shadow-[0_0_0_1px_var(--accent)] transition-all duration-200 focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
            />
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

          <div className="overflow-hidden rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] shadow-sm">
            <div className="grid grid-cols-[1fr_auto] gap-2 border-b border-[var(--border)] bg-[var(--surface-hover)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              <div>Produto</div>
              <div className="w-20 text-right">QTD</div>
            </div>
            <div className="max-h-[40vh] min-h-[120px] overflow-y-auto overscroll-contain">
              {mergedItems.length === 0 ? (
                <div className="px-4 py-8 text-center text-[var(--secondary)]">
                  Escaneie códigos de barras ou digite o código
                </div>
              ) : (
                mergedItems.map(({ groupKey, items, totalQty }) => {
                  const firstItem = items[0].item;
                  const codigos = items.map((g) => g.item.ean).join(", ");
                  return (
                    <div
                      key={groupKey}
                      className="grid grid-cols-[1fr_auto] gap-2 border-b border-[var(--border)] px-4 py-3 last:border-0"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[var(--foreground)]">
                          {groupKey}
                        </div>
                        {items.length > 1 && (
                          <div className="mt-0.5 font-mono text-xs text-[var(--muted)]">
                            {codigos}
                          </div>
                        )}
                        {items.length === 1 && (
                          <input
                            type="text"
                            value={firstItem.ean}
                            onChange={(e) => updateItem(items[0].idx, { ean: e.target.value })}
                            placeholder="Código"
                            className="mt-0.5 min-w-0 rounded bg-transparent font-mono text-xs text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30"
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            updateMergedGroup(groupKey, Math.max(0, totalQty - 1))
                          }
                          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-[var(--surface-hover)] font-medium text-[var(--foreground)] transition-all duration-200 hover:bg-[var(--surface-hover)] active:scale-95"
                        >
                          −
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
                          className="min-h-[44px] w-14 rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] text-center text-sm font-medium text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                        />
                        <button
                          onClick={() => updateMergedGroup(groupKey, totalQty + 1)}
                          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-[var(--surface-hover)] font-medium text-[var(--foreground)] transition-all duration-200 hover:bg-[var(--surface-hover)] active:scale-95"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
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
