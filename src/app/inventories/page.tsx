"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getInventories, deleteInventory, deleteAllInventories, saveInventory } from "@/lib/storage";
import { getProdutosByCodigos } from "@/lib/produtos";
import { useAuth } from "@/components/AuthProvider";
import { ConfirmDeleteDrawer } from "@/components/ConfirmDeleteDrawer";
import { DeleteAllDrawer } from "@/components/DeleteAllDrawer";
import type { Inventory, InventoryStatus } from "@/types/inventory";

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
  const { user, logout } = useAuth();
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [produtoNames, setProdutoNames] = useState<Map<string, string>>(new Map());
  const [deleteTarget, setDeleteTarget] = useState<Inventory | null>(null);
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [statusEditId, setStatusEditId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    getInventories().then(setInventories);
  }, []);

  useEffect(() => {
    if (!statusEditId) return;
    const handleClick = () => setStatusEditId(null);
    const t = setTimeout(() => document.addEventListener("click", handleClick), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("click", handleClick);
    };
  }, [statusEditId]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = () => setMenuOpen(false);
    const t = setTimeout(() => document.addEventListener("click", handleClick), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("click", handleClick);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!inventories.length) return;
    const codigos = [...new Set(inventories.flatMap((inv) => inv.items.map((i) => i.ean.trim()).filter(Boolean)))];
    if (codigos.length === 0) return;
    getProdutosByCodigos(codigos).then(setProdutoNames);
  }, [inventories]);

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

  const handleConfirmDeleteAll = async () => {
    await deleteAllInventories();
    setInventories([]);
  };

  const handleStatusChange = async (inv: Inventory, newStatus: InventoryStatus) => {
    if (user !== "admin") return;
    const updated = { ...inv, status: newStatus };
    await saveInventory(updated);
    setInventories((prev) => prev.map((i) => (i.id === inv.id ? updated : i)));
  };

  const statusLabel: Record<InventoryStatus, string> = {
    em_contagem: "Em contagem",
    finalizado: "Finalizado",
    importado: "Importado",
  };

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--background)]">
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-4 pr-14">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-1 text-[var(--secondary)] transition-colors duration-200 hover:text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 rounded-lg px-2 py-1 -ml-2"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar
          </Link>
          <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold text-[var(--foreground)]">
            Inventários
          </h1>
          <div className="relative shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((prev) => !prev);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2"
              aria-label="Menu de ações"
            >
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="6" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="12" cy="18" r="1.5" />
              </svg>
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-full z-50 mt-1 min-w-[200px] rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] py-2 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                {user && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
                  >
                    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sair ({user})
                  </button>
                )}
                {inventories.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setShowDeleteAll(true);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-[var(--destructive)] hover:bg-[var(--destructive)]/10"
                  >
                    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Deletar todos os inventários
                  </button>
                )}
              </div>
            )}
          </div>
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
                const naoCadastrados = inv.items.filter((i) => !produtoNames.get(i.ean)?.trim());
                const produtosNaoCadastrados = naoCadastrados.length;
                const itensNaoCadastrados = naoCadastrados.reduce((s, i) => s + i.quantity, 0);
                const status = inv.status ?? "em_contagem";
                return (
                  <div
                    key={inv.id}
                    className="group relative rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] shadow-sm transition-all duration-200 hover:border-[var(--accent)]/30 hover:shadow-md"
                  >
                    <Link
                      href={`/inventories/${inv.id}`}
                      className="block p-5 pr-14"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="font-semibold text-[var(--foreground)]">
                          {inv.name}
                        </h2>
                        {user !== "admin" && (
                          <span
                            className={`shrink-0 rounded-lg px-2 py-1 text-xs font-medium ${
                              status === "em_contagem"
                                ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                                : status === "finalizado"
                                  ? "bg-blue-500/20 text-blue-600 dark:text-blue-400"
                                  : "bg-[var(--success)]/20 text-[var(--success)]"
                            }`}
                          >
                            {statusLabel[status]}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-[var(--secondary)]">
                        {formatDate(inv.createdAt)}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium text-[var(--muted)]">
                        <span>{unique} produtos</span>
                        <span>{totalQty} itens</span>
                        <span className={produtosNaoCadastrados > 0 ? "text-[var(--destructive)]" : ""}>
                          {produtosNaoCadastrados} não cadastrados ({itensNaoCadastrados} itens)
                        </span>
                      </div>
                    </Link>
                    {user === "admin" && (
                      <div className="absolute right-14 top-5 z-10 flex items-center gap-0.5">
                        <span
                          className={`shrink-0 rounded-l-lg px-2 py-1 text-xs font-medium ${
                            status === "em_contagem"
                              ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                              : status === "finalizado"
                                ? "bg-blue-500/20 text-blue-600 dark:text-blue-400"
                                : "bg-[var(--success)]/20 text-[var(--success)]"
                          }`}
                        >
                          {statusLabel[status]}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setStatusEditId(statusEditId === inv.id ? null : inv.id);
                          }}
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-r-lg text-xs font-bold transition-colors ${
                            status === "em_contagem"
                              ? "bg-amber-500/30 text-amber-600 hover:bg-amber-500/40 dark:text-amber-400"
                              : status === "finalizado"
                                ? "bg-blue-500/30 text-blue-600 hover:bg-blue-500/40 dark:text-blue-400"
                                : "bg-[var(--success)]/30 text-[var(--success)] hover:bg-[var(--success)]/40"
                          }`}
                          aria-label="Alterar status"
                        >
                          +
                        </button>
                        {statusEditId === inv.id && (
                          <div className="absolute right-0 top-full mt-1 flex flex-col rounded-lg border-2 border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg">
                            {(["em_contagem", "finalizado", "importado"] as InventoryStatus[]).map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleStatusChange(inv, s);
                                  setStatusEditId(null);
                                }}
                                className={`px-3 py-1.5 text-left text-xs font-medium hover:bg-[var(--surface-hover)] ${
                                  s === status ? "bg-[var(--accent)]/10 text-[var(--accent)]" : "text-[var(--foreground)]"
                                }`}
                              >
                                {statusLabel[s]}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
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
      <DeleteAllDrawer
        isOpen={showDeleteAll}
        onClose={() => setShowDeleteAll(false)}
        onConfirm={handleConfirmDeleteAll}
      />
    </div>
  );
}
