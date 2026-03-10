"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getInventory, saveInventory } from "@/lib/storage";
import { shareTxt } from "@/lib/export";
import type { Inventory, InventoryItem } from "@/types/inventory";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function InventoryDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getInventory(id).then(setInventory);
  }, [id]);

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

  const deleteItem = useCallback(
    (index: number) => {
      if (!inventory) return;
      const items = inventory.items.filter((_, i) => i !== index);
      const updated = { ...inventory, items };
      setInventory(updated);
      void saveInventory(updated);
    },
    [inventory]
  );

  const handleRestart = useCallback(() => {
    if (!inventory) return;
    router.push(`/inventory/${inventory.id}`);
  }, [inventory, router]);

  const handleShareTxt = useCallback(async () => {
    if (!inventory) return;
    await shareTxt(inventory);
  }, [inventory]);

  if (!inventory) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-[var(--secondary)]">Carregando...</p>
      </div>
    );
  }

  const totalQty = inventory.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--background)]">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-sm">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/inventories"
              className="flex items-center gap-1 text-[var(--secondary)] transition-colors hover:text-[var(--foreground)]"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Voltar
            </Link>
            <h1 className="truncate text-lg font-semibold text-[var(--foreground)]">
              {inventory.name}
            </h1>
          </div>
          <p className="mt-1 text-sm text-[var(--secondary)]">
            {formatDate(inventory.createdAt)}
          </p>
          <div className="mt-2 flex gap-4 text-sm font-medium text-[var(--muted)]">
            <span>{inventory.items.length} produtos</span>
            <span>{totalQty} itens</span>
          </div>
          <input
            type="search"
            placeholder="Buscar EAN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-3 w-full rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--foreground)] placeholder-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
          />
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4">
        <div className="mx-auto max-w-2xl">
          <div className="overflow-hidden rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] shadow-sm">
            <div className="grid grid-cols-[1fr_auto_auto] gap-2 border-b border-[var(--border)] bg-[var(--surface-hover)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              <div>EAN</div>
              <div className="w-20 text-right">Qtd</div>
              <div className="w-10" />
            </div>
            <div className="max-h-[50vh] overflow-y-auto">
              {filteredItems.length === 0 ? (
                <div className="px-4 py-8 text-center text-[var(--secondary)]">
                  Nenhum item
                </div>
              ) : (
                filteredItems.map(({ item, idx }) => (
                  <div
                    key={`${item.ean}-${idx}`}
                    className="grid grid-cols-[1fr_auto_auto] gap-2 border-b border-[var(--border)] px-4 py-3 last:border-0"
                  >
                    <input
                      type="text"
                      value={item.ean}
                      onChange={(e) =>
                        updateItem(idx, { ean: e.target.value })
                      }
                      className="min-w-0 rounded-lg bg-transparent font-mono text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                    />
                    <input
                      type="number"
                      min={0}
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(idx, {
                          quantity: Math.max(
                            0,
                            parseInt(e.target.value, 10) || 0
                          ),
                        })
                      }
                      className="h-8 w-14 rounded-lg border-2 border-[var(--border)] bg-[var(--surface)] text-center text-sm font-medium text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                    />
                    <button
                      onClick={() => deleteItem(idx)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--destructive)] transition-colors hover:bg-[var(--destructive)]/10"
                      aria-label="Excluir item"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={handleRestart}
              className="flex h-14 w-full items-center justify-center rounded-2xl border-2 border-[var(--border)] font-semibold text-[var(--foreground)] transition-all duration-200 hover:bg-[var(--surface-hover)] active:scale-[0.98]"
            >
              Continuar Contagem
            </button>
            <button
              onClick={handleShareTxt}
              className="flex h-14 w-full items-center justify-center rounded-2xl bg-[var(--primary)] font-semibold text-[var(--primary-foreground)] transition-all duration-200 hover:bg-[var(--primary-hover)] active:scale-[0.98]"
            >
              Compartilhar TXT
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
