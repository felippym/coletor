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
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-500">Carregando...</p>
      </div>
    );
  }

  const totalQty = inventory.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-black/95">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <div className="flex items-center gap-4">
            <Link
              href="/inventories"
              className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              ← Voltar
            </Link>
            <h1 className="truncate text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {inventory.name}
            </h1>
          </div>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {formatDate(inventory.createdAt)}
          </p>
          <div className="mt-2 flex gap-4 text-sm text-zinc-600 dark:text-zinc-400">
            <span>{inventory.items.length} produtos</span>
            <span>{totalQty} itens</span>
          </div>
          <input
            type="search"
            placeholder="Buscar EAN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-3 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm placeholder-zinc-500 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:placeholder-zinc-400"
          />
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4">
        <div className="mx-auto max-w-3xl">
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="grid grid-cols-[1fr_auto_auto] gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-2 text-xs font-medium uppercase text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
              <div>EAN</div>
              <div className="w-20 text-right">Qtd</div>
              <div className="w-10" />
            </div>
            <div className="max-h-[50vh] overflow-y-auto">
              {filteredItems.length === 0 ? (
                <div className="px-4 py-8 text-center text-zinc-500">
                  Nenhum item
                </div>
              ) : (
                filteredItems.map(({ item, idx }) => (
                  <div
                    key={`${item.ean}-${idx}`}
                    className="grid grid-cols-[1fr_auto_auto] gap-2 border-b border-zinc-100 px-4 py-3 last:border-0 dark:border-zinc-800"
                  >
                    <input
                      type="text"
                      value={item.ean}
                      onChange={(e) =>
                        updateItem(idx, { ean: e.target.value })
                      }
                      className="min-w-0 rounded bg-transparent font-mono text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:text-zinc-50 dark:focus:ring-zinc-600"
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
                      className="h-8 w-14 rounded-lg border border-zinc-200 bg-white text-center text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                    />
                    <button
                      onClick={() => deleteItem(idx)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={handleRestart}
              className="flex h-14 w-full items-center justify-center rounded-full border border-zinc-200 font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Continuar Contagem
            </button>
            <button
              onClick={handleShareTxt}
              className="flex h-14 w-full items-center justify-center rounded-full bg-zinc-900 font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Compartilhar TXT
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
