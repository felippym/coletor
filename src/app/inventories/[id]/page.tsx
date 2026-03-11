"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getInventory, saveInventory } from "@/lib/storage";
import { getProdutosByCodigos } from "@/lib/produtos";
import { shareTxt } from "@/lib/export";
import { useAuth } from "@/components/AuthProvider";
import type { Inventory, InventoryItem, InventoryStatus } from "@/types/inventory";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const statusLabel: Record<InventoryStatus, string> = {
  em_contagem: "Em contagem",
  finalizado: "Finalizado",
  importado: "Importado",
};

export default function InventoryDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { user } = useAuth();

  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [search, setSearch] = useState("");
  const [produtoNames, setProdutoNames] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    getInventory(id).then(setInventory);
  }, [id]);

  useEffect(() => {
    if (!inventory?.items.length) return;
    const codigos = [...new Set(inventory.items.map((i) => i.ean.trim()).filter(Boolean))];
    if (codigos.length === 0) return;
    getProdutosByCodigos(codigos).then(setProdutoNames);
  }, [inventory?.items]);

  /** Agrupa por nome exato do produto e unifica quantidade */
  const mergedItems = useMemo(() => {
    if (!inventory) return [];
    const withFilter = !search.trim()
      ? inventory.items.map((item, idx) => ({ item, idx }))
      : inventory.items
          .map((item, idx) => ({ item, idx }))
          .filter(({ item }) => {
            const q = search.trim().toLowerCase();
            const nome = produtoNames.get(item.ean)?.toLowerCase() ?? "";
            return item.ean.toLowerCase().includes(q) || nome.includes(q);
          });

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

  const deleteMergedGroup = useCallback(
    (groupKey: string) => {
      if (!inventory) return;
      const indicesToRemove = inventory.items
        .map((item, idx) => ({ item, idx }))
        .filter(({ item }) => (produtoNames.get(item.ean) || item.ean) === groupKey)
        .map(({ idx }) => idx)
        .sort((a, b) => b - a);
      let items = [...inventory.items];
      indicesToRemove.forEach((i) => items.splice(i, 1));
      const updated = { ...inventory, items };
      setInventory(updated);
      void saveInventory(updated);
    },
    [inventory, produtoNames]
  );

  const updateMergedGroup = useCallback(
    (groupKey: string, newQuantity: number) => {
      if (!inventory) return;
      const items = [...inventory.items];
      const indices = items
        .map((item, idx) => ({ item, idx }))
        .filter(({ item }) => (produtoNames.get(item.ean) || item.ean) === groupKey)
        .map(({ idx }) => idx)
        .sort((a, b) => a - b);

      if (indices.length === 0) return;

      if (newQuantity <= 0) {
        indices.reverse().forEach((i) => items.splice(i, 1));
      } else {
        items[indices[0]] = { ...items[indices[0]], quantity: newQuantity };
        indices.slice(1).reverse().forEach((i) => items.splice(i, 1));
      }
      const updated = { ...inventory, items };
      setInventory(updated);
      void saveInventory(updated);
    },
    [inventory, produtoNames]
  );

  const handleRestart = useCallback(() => {
    if (!inventory) return;
    router.push(`/inventory/${inventory.id}`);
  }, [inventory, router]);

  const handleShareTxt = useCallback(async () => {
    if (!inventory) return;
    const result = await shareTxt(inventory);
    if (result?.success) {
      const updated = { ...inventory, status: "importado" as const };
      setInventory(updated);
      await saveInventory(updated);
    }
  }, [inventory]);

  const handleStatusChange = useCallback(
    async (newStatus: InventoryStatus) => {
      if (!inventory || user !== "admin") return;
      const updated = { ...inventory, status: newStatus };
      setInventory(updated);
      await saveInventory(updated);
    },
    [inventory, user]
  );

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
            {user === "admin" ? (
              <select
                value={inventory.status ?? "em_contagem"}
                onChange={(e) => handleStatusChange(e.target.value as InventoryStatus)}
                className="shrink-0 rounded-lg border-2 border-[var(--border)] bg-[var(--surface-hover)] px-2 py-1 text-xs font-medium text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
              >
                <option value="em_contagem">Em contagem</option>
                <option value="finalizado">Finalizado</option>
                <option value="importado">Importado</option>
              </select>
            ) : (
              <span
                className={`shrink-0 rounded-lg px-2 py-1 text-xs font-medium ${
                  (inventory.status ?? "em_contagem") === "em_contagem"
                    ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                    : (inventory.status ?? "em_contagem") === "finalizado"
                      ? "bg-blue-500/20 text-blue-600 dark:text-blue-400"
                      : "bg-[var(--success)]/20 text-[var(--success)]"
                }`}
              >
                {statusLabel[inventory.status ?? "em_contagem"]}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[var(--secondary)]">
            {formatDate(inventory.createdAt)}
          </p>
          <div className="mt-2 flex gap-4 text-sm font-medium text-[var(--muted)]">
            <span>{mergedItems.length} produtos</span>
            <span>{totalQty} itens</span>
          </div>
          <input
            type="search"
            placeholder="Buscar produto ou código..."
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
              <div>Produto</div>
              <div className="w-20 text-right">Qtd</div>
              <div className="w-10" />
            </div>
            <div className="max-h-[50vh] overflow-y-auto">
              {mergedItems.length === 0 ? (
                <div className="px-4 py-8 text-center text-[var(--secondary)]">
                  Nenhum item
                </div>
              ) : (
                mergedItems.map(({ groupKey, displayLabel, items, totalQty }) => {
                  const firstItem = items[0].item;
                  const codigos = items.map((g) => g.item.ean).join(", ");
                  return (
                    <div
                      key={groupKey}
                      className="grid grid-cols-[1fr_auto_auto] gap-2 border-b border-[var(--border)] px-4 py-3 last:border-0"
                    >
                      <div className="min-w-0">
                        <div
                          className={`text-sm font-medium ${
                            displayLabel === "NÃO CADASTRADO"
                              ? "text-[var(--destructive)]"
                              : "text-[var(--foreground)]"
                          }`}
                        >
                          {displayLabel}
                        </div>
                        {items.length > 1 ? (
                          <div className="mt-0.5 font-mono text-xs text-[var(--muted)]">
                            {codigos}
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={firstItem.ean}
                            onChange={(e) => updateItem(items[0].idx, { ean: e.target.value })}
                            placeholder="Código"
                            className="mt-0.5 min-w-0 rounded bg-transparent font-mono text-xs text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30"
                          />
                        )}
                      </div>
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
                        className="h-8 w-14 rounded-lg border-2 border-[var(--border)] bg-[var(--surface)] text-center text-sm font-medium text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                      />
                      <button
                        onClick={() => deleteMergedGroup(groupKey)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--destructive)] transition-colors hover:bg-[var(--destructive)]/10"
                        aria-label="Excluir item"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  );
                })
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
