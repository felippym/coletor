"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getInventories } from "@/lib/storage";
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

  useEffect(() => {
    getInventories().then(setInventories);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-4">
          <Link
            href="/"
            className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            ← Voltar
          </Link>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Inventários
          </h1>
        </div>
      </header>

      <main className="flex-1 p-4">
        <div className="mx-auto max-w-3xl space-y-3">
          {inventories.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
              Nenhum inventário salvo. Inicie um novo na tela inicial.
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
                  <Link
                    key={inv.id}
                    href={`/inventories/${inv.id}`}
                    className="block rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                  >
                    <h2 className="font-medium text-zinc-900 dark:text-zinc-50">
                      {inv.name}
                    </h2>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                      {formatDate(inv.createdAt)}
                    </p>
                    <div className="mt-2 flex gap-4 text-sm text-zinc-600 dark:text-zinc-400">
                      <span>{unique} produtos</span>
                      <span>{totalQty} itens</span>
                    </div>
                  </Link>
                );
              })
          )}
        </div>
      </main>
    </div>
  );
}
