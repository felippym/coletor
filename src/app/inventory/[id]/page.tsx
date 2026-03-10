"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getInventory, saveInventory } from "@/lib/storage";
import { HiddenBarcodeInput } from "@/components/HiddenBarcodeInput";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { ScanConfirmation } from "@/components/ScanConfirmation";
import { playScanSound } from "@/lib/scan-sound";
import type { Inventory, InventoryItem } from "@/types/inventory";

export default function InventoryScanPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [search, setSearch] = useState("");
  const [confirmScan, setConfirmScan] = useState<{ ean: string; quantity: number } | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");

  useEffect(() => {
    getInventory(id).then(setInventory);
  }, [id]);

  const totalItems = useMemo(
    () => inventory?.items.reduce((s, i) => s + i.quantity, 0) ?? 0,
    [inventory]
  );
  const uniqueProducts = useMemo(() => inventory?.items.length ?? 0, [inventory]);

  const filteredItems = useMemo(() => {
    if (!inventory) return [];
    if (!search.trim()) {
      return inventory.items.map((item, idx) => ({ item, idx }));
    }
    const q = search.trim().toLowerCase();
    return inventory.items
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => item.ean.toLowerCase().includes(q));
  }, [inventory, search]);

  const processBarcode = useCallback(
    (ean: string) => {
      const trimmed = ean.trim();
      if (!trimmed || !inventory) return;

      const items = [...inventory.items];
      const idx = items.findIndex((i) => i.ean === trimmed);

      if (idx >= 0) {
        items[idx] = { ...items[idx], quantity: items[idx].quantity + 1 };
      } else {
        items.push({ ean: trimmed, quantity: 1 });
      }

      const updated = { ...inventory, items };
      setInventory(updated);
      void saveInventory(updated);
      playScanSound();
      setConfirmScan({
        ean: trimmed,
        quantity: idx >= 0 ? items[idx].quantity : 1,
      });
    },
    [inventory]
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

  const handleEndInventory = useCallback(async () => {
    if (inventory) {
      await saveInventory(inventory);
      router.push("/inventories");
    }
  }, [inventory, router]);

  if (!inventory) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-500">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      <HiddenBarcodeInput onScan={processBarcode} />

      {/* Sticky header */}
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-black/95">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <h1 className="truncate text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {inventory.name}
          </h1>
          <div className="mt-1 flex gap-4 text-sm text-zinc-600 dark:text-zinc-400">
            <span>{uniqueProducts} produtos</span>
            <span>{totalItems} itens</span>
          </div>
          <div className="mt-3">
            <input
              type="search"
              placeholder="Buscar EAN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm placeholder-zinc-500 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:placeholder-zinc-400"
            />
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-3xl p-4">
          {/* Digite ou escaneie */}
          <input
            type="text"
            inputMode="numeric"
            placeholder="Digite ou escaneie o código"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const value = barcodeInput.trim();
                if (value) {
                  processBarcode(value);
                  setBarcodeInput("");
                }
              }
            }}
            className="mb-4 w-full rounded-xl border-2 border-zinc-200 bg-white px-4 py-3.5 text-base font-mono placeholder-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-500 dark:focus:border-zinc-600 dark:focus:ring-zinc-700"
          />

          {/* Camera toggle */}
          <button
            onClick={() => setCameraEnabled((e) => !e)}
            className="mb-4 flex h-12 w-full items-center justify-center rounded-xl border border-zinc-200 bg-white font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {cameraEnabled ? "Ocultar câmera" : "Escanear com câmera"}
          </button>

          {cameraEnabled && (
            <div className="mb-4">
              <BarcodeScanner onScan={processBarcode} enabled={cameraEnabled} />
            </div>
          )}

          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="grid grid-cols-[1fr_auto] gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-2 text-xs font-medium uppercase text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
              <div>EAN</div>
              <div className="w-20 text-right">Qtd</div>
            </div>
            <div className="max-h-[40vh] min-h-[120px] overflow-y-auto overscroll-contain">
              {filteredItems.length === 0 ? (
                <div className="px-4 py-8 text-center text-zinc-500">
                  Escaneie códigos de barras ou digite o EAN
                </div>
              ) : (
                filteredItems.map(({ item, idx }) => (
                  <div
                    key={`${item.ean}-${idx}`}
                    className="grid grid-cols-[1fr_auto] gap-2 border-b border-zinc-100 px-4 py-3 last:border-0 dark:border-zinc-800"
                  >
                    <input
                      type="text"
                      value={item.ean}
                      onChange={(e) => updateItem(idx, { ean: e.target.value })}
                      className="min-w-0 rounded bg-transparent font-mono text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:text-zinc-50 dark:focus:ring-zinc-600"
                    />
                    <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            updateItem(idx, {
                              quantity: Math.max(0, item.quantity - 1),
                            })
                          }
                          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-zinc-200 text-zinc-700 hover:bg-zinc-300 active:bg-zinc-400 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600 dark:active:bg-zinc-500"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={0}
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(idx, {
                              quantity: Math.max(0, parseInt(e.target.value, 10) || 0),
                            })
                          }
                          className="min-h-[44px] w-14 rounded-lg border border-zinc-200 bg-white text-center text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                        />
                        <button
                          onClick={() => updateItem(idx, { quantity: item.quantity + 1 })}
                          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-zinc-200 text-zinc-700 hover:bg-zinc-300 active:bg-zinc-400 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600 dark:active:bg-zinc-500"
                        >
                          +
                        </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            onClick={handleEndInventory}
            className="mt-6 flex h-14 w-full items-center justify-center rounded-full bg-zinc-900 font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Encerrar Inventário
          </button>
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
