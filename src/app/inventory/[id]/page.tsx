"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const barcodeInputRef = useRef<HTMLInputElement>(null);

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
        const item = { ...items[idx], quantity: items[idx].quantity + 1 };
        items.splice(idx, 1);
        items.unshift(item);
      } else {
        items.unshift({ ean: trimmed, quantity: 1 });
      }

      const updated = { ...inventory, items };
      setInventory(updated);
      void saveInventory(updated);
      playScanSound();
      setConfirmScan({
        ean: trimmed,
        quantity: items[0].quantity,
      });
      setBarcodeInput("");
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

  useEffect(() => {
    if (inventory) {
      barcodeInputRef.current?.focus();
    }
  }, [inventory]);

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
            <span>{uniqueProducts} produtos</span>
            <span>{totalItems} itens</span>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="sticky top-0 z-20 shrink-0 space-y-4 border-b border-[var(--border)] bg-[var(--background)] p-4">
          <div className="mx-auto max-w-2xl">
            <input
              type="search"
              placeholder="Buscar EAN..."
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
              <div>EAN</div>
              <div className="w-20 text-right">QTD</div>
            </div>
            <div className="max-h-[40vh] min-h-[120px] overflow-y-auto overscroll-contain">
              {filteredItems.length === 0 ? (
                <div className="px-4 py-8 text-center text-[var(--secondary)]">
                  Escaneie códigos de barras ou digite o EAN
                </div>
              ) : (
                filteredItems.map(({ item, idx }) => (
                  <div
                    key={`${item.ean}-${idx}`}
                    className="grid grid-cols-[1fr_auto] gap-2 border-b border-[var(--border)] px-4 py-3 last:border-0"
                  >
                    <input
                      type="text"
                      value={item.ean}
                      onChange={(e) => updateItem(idx, { ean: e.target.value })}
                      className="min-w-0 rounded-lg bg-transparent font-mono text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                    />
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          updateItem(idx, {
                            quantity: Math.max(0, item.quantity - 1),
                          })
                        }
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-[var(--surface-hover)] font-medium text-[var(--foreground)] transition-all duration-200 hover:bg-[var(--border)] active:scale-95"
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
                        className="min-h-[44px] w-14 rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] text-center text-sm font-medium text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                      />
                      <button
                        onClick={() => updateItem(idx, { quantity: item.quantity + 1 })}
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-[var(--surface-hover)] font-medium text-[var(--foreground)] transition-all duration-200 hover:bg-[var(--border)] active:scale-95"
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
