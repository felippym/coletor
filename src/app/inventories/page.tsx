"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { Package, Trash2, Plus, Clock, Box, AlertTriangle, MessageSquare, Filter, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { getInventories, deleteInventory, deleteAllInventories, saveInventory } from "@/lib/storage";
import { getProdutosByCodigos } from "@/lib/produtos";
import { useAuth } from "@/components/AuthProvider";
import { ConfirmDeleteDrawer } from "@/components/ConfirmDeleteDrawer";
import { DeleteAllDrawer } from "@/components/DeleteAllDrawer";
import { StartInventoryDrawer } from "@/components/StartInventoryDrawer";
import { SkeletonCardList } from "@/components/Skeleton";
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
  const [loading, setLoading] = useState(true);
  const [produtoNames, setProdutoNames] = useState<Map<string, string>>(new Map());
  const [deleteTarget, setDeleteTarget] = useState<Inventory | null>(null);
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [statusEditId, setStatusEditId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showStartDrawer, setShowStartDrawer] = useState(false);
  const [filterStatus, setFilterStatus] = useState<InventoryStatus | "todos">("todos");
  const [filterCreatedBy, setFilterCreatedBy] = useState<string | "todos">("todos");
  const [filterSearch, setFilterSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showFilters) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) {
        setShowFilters(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showFilters]);

  const filteredInventories = useMemo(() => {
    const filtered = inventories.filter((inv) => {
      const status = inv.status ?? "em_contagem";
      if (filterStatus !== "todos" && status !== filterStatus) return false;
      if (filterCreatedBy !== "todos" && inv.createdBy !== filterCreatedBy) return false;
      if (filterSearch.trim()) {
        const q = filterSearch.trim().toLowerCase();
        const matchName = inv.name.toLowerCase().includes(q);
        const matchCreatedBy = inv.createdBy?.toLowerCase().includes(q);
        const matchObservation = inv.observation?.toLowerCase().includes(q);
        if (!matchName && !matchCreatedBy && !matchObservation) return false;
      }
      return true;
    });
    return [...filtered].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [inventories, filterStatus, filterCreatedBy, filterSearch]);

  const createdByOptions = useMemo(() => {
    const users = [...new Set(inventories.map((i) => i.createdBy).filter(Boolean))] as string[];
    return users.sort();
  }, [inventories]);

  useEffect(() => {
    getInventories().then((data) => {
      const filtered =
        user === "admin"
          ? data
          : data.filter((inv) => inv.createdBy === user);
      setInventories(filtered);
      setLoading(false);
    });
  }, [user]);

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

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--background)]">
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface)]/95 pt-[env(safe-area-inset-top)] backdrop-blur-sm">
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
          <button
            onClick={() => setShowStartDrawer(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 font-semibold text-[var(--primary-foreground)] transition-all duration-200 hover:bg-[var(--primary-hover)] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Iniciar novo inventário
          </button>

          {!loading && inventories.length > 0 && user === "admin" && (
            <div ref={filtersRef} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
              <div className="flex items-center justify-between gap-2 p-3">
                <button
                  type="button"
                  onClick={() => setShowFilters((v) => !v)}
                  className="flex flex-1 items-center justify-between gap-2 text-left text-sm font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] -m-1 p-1 rounded-lg"
                >
                  <span className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filtros
                    <span className="text-xs font-normal">
                      ({filteredInventories.length} de {inventories.length})
                    </span>
                  </span>
                  {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFilterSearch("");
                    setFilterStatus("todos");
                    setFilterCreatedBy("todos");
                  }}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-hover)] px-2.5 py-1.5 text-xs font-medium text-[var(--secondary)] transition-colors hover:bg-[var(--border)]"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Limpar
                </button>
              </div>
              {showFilters && (
                <div className="space-y-3 border-t border-[var(--border)] p-3">
                  <input
                    type="search"
                    placeholder="Buscar por nome, criador, observação..."
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    className="w-full rounded-lg border-2 border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted)] transition-colors focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                  />
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-[var(--muted)] self-center">Status:</span>
                    {(["todos", "em_contagem", "finalizado", "importado"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setFilterStatus(s)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          filterStatus === s
                            ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)]"
                            : "border-[var(--border)] bg-[var(--surface-hover)] text-[var(--secondary)] hover:border-[var(--border)]"
                        }`}
                      >
                        {s === "todos" ? "Todos" : statusLabel[s]}
                      </button>
                    ))}
                  </div>
                  {createdByOptions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs text-[var(--muted)] self-center">Criador:</span>
                      <button
                        type="button"
                        onClick={() => setFilterCreatedBy("todos")}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          filterCreatedBy === "todos"
                            ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)]"
                            : "border-[var(--border)] bg-[var(--surface-hover)] text-[var(--secondary)]"
                        }`}
                      >
                        Todos
                      </button>
                      {createdByOptions.map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setFilterCreatedBy(u)}
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                            filterCreatedBy === u
                              ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)]"
                              : u.toLowerCase() === "leblon"
                                ? "border-pink-500/40 bg-pink-500/10 text-pink-600 dark:text-pink-400"
                                : u.toLowerCase() === "ipanema"
                                  ? "border-purple-500/40 bg-purple-500/10 text-purple-600 dark:text-purple-400"
                                  : "border-[var(--border)] bg-[var(--surface-hover)] text-[var(--secondary)]"
                          }`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {loading ? (
            <SkeletonCardList count={4} />
          ) : inventories.length === 0 ? (
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
            filteredInventories.map((inv) => {
                const totalQty = inv.items.reduce((s, i) => s + i.quantity, 0);
                const unique = inv.items.length;
                const naoCadastrados = inv.items.filter((i) => !produtoNames.get(i.ean)?.trim());
                const produtosNaoCadastrados = naoCadastrados.length;
                const itensNaoCadastrados = naoCadastrados.reduce((s, i) => s + i.quantity, 0);
                const status = inv.status ?? "em_contagem";
                const { className: statusClass } = statusConfig[status];
                const formattedDate = formatDate(inv.createdAt);

                return (
                  <div
                    key={inv.id}
                    className="group relative rounded-xl bg-[var(--surface)] border border-[var(--border)]/60 p-5 transition-all duration-200 hover:border-[var(--border)] hover:shadow-lg"
                  >
                    <Link
                      href={`/inventories/${inv.id}`}
                      className={`block -m-5 p-5 ${user === "admin" ? "pr-10" : "pr-5"}`}
                    >
                      {/* Top row */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--surface-hover)]">
                            <Package className="h-5 w-5 text-[var(--muted)]" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-[var(--foreground)] text-base tracking-tight">
                                {inv.name}
                              </h3>
                              {inv.createdBy && (
                                <span
                                  className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                                    inv.createdBy.toLowerCase() === "leblon"
                                      ? "border-pink-500/40 bg-pink-500/15 text-pink-600 dark:text-pink-400"
                                      : inv.createdBy.toLowerCase() === "ipanema"
                                        ? "border-purple-500/40 bg-purple-500/15 text-purple-600 dark:text-purple-400"
                                        : "border-[var(--border)] bg-[var(--surface-hover)] text-[var(--secondary)]"
                                  }`}
                                >
                                  {inv.createdBy}
                                </span>
                              )}
                              {inv.observation && (
                                <MessageSquare className="h-4 w-4 shrink-0 text-[var(--muted)]" aria-label="Tem observação" />
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 text-sm text-[var(--muted)]">
                              <Clock className="h-3.5 w-3.5" />
                              <span>{formattedDate}</span>
                            </div>
                          </div>
                        </div>

                        {user !== "admin" && (
                          <span
                            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium shrink-0 ${statusClass}`}
                          >
                            {statusLabel[status]}
                          </span>
                        )}
                      </div>

                      {/* Bottom row */}
                      <div className="pt-3 border-t border-[var(--border)]/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1.5 text-[var(--muted)]">
                            <Box className="h-3.5 w-3.5" />
                            <span>
                              <span className="font-medium text-[var(--foreground)]">{unique}</span> produtos
                            </span>
                          </div>
                          <span className="text-[var(--border)]">•</span>
                          <span className="text-[var(--muted)]">
                            <span className="font-medium text-[var(--foreground)]">{totalQty}</span> itens
                          </span>
                          <>
                            <span className="text-[var(--border)]">•</span>
                            {produtosNaoCadastrados > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[var(--destructive)]">
                                <span className="text-sm font-medium">{produtosNaoCadastrados}</span>
                                <AlertTriangle className="h-4 w-4 shrink-0" aria-label="Não cadastrado" />
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-[var(--success)]">
                                <span
                                  className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--success)]"
                                  aria-hidden
                                />
                                <span className="text-sm font-medium">validado</span>
                              </span>
                            )}
                          </>
                          </div>
                          <button
                            onClick={(e) => handleDeleteClick(e, inv)}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--destructive)]/10 text-[var(--destructive)] transition-colors hover:bg-[var(--destructive)]/20"
                            aria-label="Excluir inventário"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </Link>

                    {user === "admin" && (
                      <div className="absolute right-10 top-5 z-10 flex items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${statusClass}`}
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
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-hover)] text-[var(--muted)] transition-colors hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)]"
                          aria-label="Alterar status"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        {statusEditId === inv.id && (
                          <div className="absolute right-0 top-full mt-1 flex flex-col rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg">
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
      <StartInventoryDrawer
        isOpen={showStartDrawer}
        onClose={() => setShowStartDrawer(false)}
        createdBy={user}
      />
    </div>
  );
}
