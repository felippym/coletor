"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Trash2, Minus, Plus, Clock, Package, Box } from "lucide-react";
import { getInventory, saveInventory } from "@/lib/storage";
import { getProdutosByCodigos } from "@/lib/produtos";
import { shareTxt } from "@/lib/export";
import { useAuth } from "@/components/AuthProvider";
import type { Inventory, InventoryItem, InventoryStatus } from "@/types/inventory";

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

export default function InventoryDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  useAuth();

  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [search, setSearch] = useState("");
  const [produtoNames, setProdutoNames] = useState<Map<string, string>>(new Map());
  const [expandedCodesKey, setExpandedCodesKey] = useState<string | null>(null);

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

          {/* Linha 2: Data e resumo */}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-[var(--muted)]">
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 shrink-0" />
              {formatDate(inventory.createdAt)}
            </span>
            <span className="text-[var(--border)]" aria-hidden>•</span>
            <span className="flex items-center gap-1.5">
              <Package className="h-4 w-4 shrink-0" />
              <span className="font-medium text-[var(--foreground)]">{mergedItems.length}</span>
              <span>produtos</span>
            </span>
            <span className="text-[var(--border)]" aria-hidden>•</span>
            <span className="flex items-center gap-1.5">
              <Box className="h-4 w-4 shrink-0" />
              <span className="font-medium text-[var(--foreground)]">{totalQty}</span>
              <span>itens</span>
            </span>
          </div>

          {/* Linha 4: Busca */}
          <input
            type="search"
            placeholder="Buscar produto ou código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-4 w-full rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--foreground)] placeholder-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
          />
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4">
        <div className="mx-auto max-w-2xl">
          <div className="overflow-hidden rounded-xl border border-[var(--border)]/60 bg-[var(--surface)] transition-all duration-200 hover:border-[var(--border)] hover:shadow-lg">
            <div className="grid grid-cols-[1fr_auto_auto] gap-2 border-b border-[var(--border)]/50 bg-[var(--surface-hover)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
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
                  const codigos = items.map((g) => g.item.ean).join(", ");
                  return (
                    <div
                      key={groupKey}
                      className="grid grid-cols-[1fr_auto_auto] items-center gap-2 border-b border-[var(--border)]/50 px-4 py-3 last:border-0"
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
                            {codigos}
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
                                {codigos}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => updateMergedGroup(groupKey, Math.max(0, totalQty - 1))}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] disabled:opacity-40 disabled:pointer-events-none"
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
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
                          aria-label="Aumentar quantidade"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <button
                        onClick={() => deleteMergedGroup(groupKey)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--destructive)]/10 text-[var(--destructive)] transition-colors hover:bg-[var(--destructive)]/20"
                        aria-label="Excluir item"
                      >
                        <Trash2 className="h-4 w-4" />
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
