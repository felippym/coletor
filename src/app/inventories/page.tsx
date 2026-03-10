"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getInventories, deleteInventory } from "@/lib/storage";
import { ConfirmDeleteDrawer } from "@/components/ConfirmDeleteDrawer";
import type { Inventory } from "@/types/inventory";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function InventoriesPage() {
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Inventory | null>(null);

  useEffect(() => {
    getInventories().then(setInventories);
  }, []);

  const handleDeleteClick = (e: React.MouseEvent, inv: Inventory) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteTarget(inv);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteInventory(deleteTarget.id);
    setInventories((prev) => prev.filter((i) => i.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-4 px-4 py-4">
          <Link
            href="/"
            className="flex items-center gap-1 text-[var(--secondary)] transition-colors duration-200 hover:text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 rounded-lg px-2 py-1 -ml-2"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar
          </Link>
          <h1 className="text-lg font-semibold text-[var(--foreground)]">
            Inventários
          </h1>
        </div>
      </header>

      <main className="flex-1 p-4">
        <div className="mx-auto max-w-2xl space-y-4">
          {inventories.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--surface)] p-12 text-center">
              <p className="text-[var(--secondary)]">
                Nenhum inventário salvo. Inicie um novo na tela inicial.
              </p>
              <Link
                href="/"
                className="mt-4 inline-block font-medium text-[var(--accent)] transition-colors hover:text-[var(--accent-hover)]"
              >
                Ir para início →
              </Link>
            </div>
          ) : (
            inventories
              .sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              )
              .map((inv) => {
                const totalQty = inv.items.reduce((s, i) => s + i.quantity, 0);
                const unique = inv.items.length;
                return (
                  <div
                    key={inv.id}
                    className="group relative rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] shadow-sm transition-all duration-200 hover:border-[var(--accent)]/30 hover:shadow-md"
                  >
                    <Link
                      href={`/inventories/${inv.id}`}
                      className="block p-5 pr-14"
                    >
                      <h2 className="font-semibold text-[var(--foreground)]">
                        {inv.name}
                      </h2>
                      <p className="mt-1 text-sm text-[var(--secondary)]">
                        {formatDate(inv.createdAt)}
                      </p>
                      <div className="mt-3 flex gap-4 text-sm font-medium text-[var(--muted)]">
                        <span>{unique} produtos</span>
                        <span>{totalQty} itens</span>
                      </div>
                    </Link>
                    <button
                      onClick={(e) => handleDeleteClick(e, inv)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[var(--destructive)] transition-all duration-200 hover:bg-[var(--destructive)]/10 focus:outline-none focus:ring-2 focus:ring-[var(--destructive)] focus:ring-offset-2"
                      aria-label="Excluir inventário"
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
      </main>
      <ConfirmDeleteDrawer
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Excluir inventário?"
        message={deleteTarget ? `"${deleteTarget.name}" será excluído permanentemente. Esta ação não pode ser desfeita.` : undefined}
      />
    </div>
  );
}
