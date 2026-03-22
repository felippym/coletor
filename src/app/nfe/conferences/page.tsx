"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { FileText, Clock, Package, MessageSquare, Trash2, User, ChevronDown, ChevronUp, Filter, RotateCcw, Copy } from "lucide-react";
import { getNFeConferences, getNFeConference, saveNFeConference, deleteNFeConference } from "@/lib/nfe-storage";
import { useAuth } from "@/components/AuthProvider";
import { SkeletonCardList } from "@/components/Skeleton";
import { ConfirmDeleteDrawer } from "@/components/ConfirmDeleteDrawer";
import type { NFeConference, NFeProduct, NFeConferenceStatus } from "@/types/nfe";

type ConferenceStatus = "em_andamento" | "em_analise" | "concluida" | "encerrado";

function getConferenceStatus(products: NFeProduct[]): ConferenceStatus {
  const totalCounted = products.reduce((s, p) => s + p.countedQty, 0);
  if (totalCounted === 0) return "em_andamento";

  const nfeProducts = products.filter((p) => p.expectedQty > 0);
  const allMatch =
    nfeProducts.length > 0 &&
    nfeProducts.every((p) => p.countedQty === p.expectedQty);
  return allMatch ? "concluida" : "em_andamento";
}

function getEffectiveConferenceStatus(conf: NFeConference): ConferenceStatus {
  return (conf.status ?? getConferenceStatus(conf.products ?? [])) as ConferenceStatus;
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

const statusLabel: Record<ConferenceStatus, string> = {
  em_andamento: "Em andamento",
  em_analise: "Em análise",
  concluida: "Concluída",
  encerrado: "Encerrado",
};

const statusConfig: Record<ConferenceStatus, { className: string }> = {
  em_andamento: {
    className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  },
  em_analise: {
    className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  },
  concluida: {
    className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  },
  encerrado: {
    className: "border border-[var(--border)] bg-[var(--surface-hover)] text-[var(--secondary)]",
  },
};

export default function NFeConferencesPage() {
  const { user } = useAuth();
  const [conferences, setConferences] = useState<NFeConference[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<NFeConference | null>(null);
  const [statusEditId, setStatusEditId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<ConferenceStatus | "todos">("todos");
  const [filterCreatedBy, setFilterCreatedBy] = useState<string | "todos">("todos");
  const [filterSearch, setFilterSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const filtersRef = useRef<HTMLDivElement>(null);

  const handleCopyNumber = (e: React.MouseEvent, id: string, invoiceNumber: string) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(invoiceNumber);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

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

  const filteredConferences = useMemo(() => {
    return conferences.filter((conf) => {
      const status = getEffectiveConferenceStatus(conf);

      if (filterStatus !== "todos" && status !== filterStatus) return false;
      if (filterCreatedBy !== "todos" && conf.createdBy !== filterCreatedBy) return false;

      if (filterSearch.trim()) {
        const q = filterSearch.trim().toLowerCase();
        const matchSupplier = conf.supplierName.toLowerCase().includes(q);
        const matchInvoice = conf.invoiceNumber.toLowerCase().includes(q);
        const matchStartedBy = conf.startedBy?.toLowerCase().includes(q);
        const matchCreatedBy = conf.createdBy?.toLowerCase().includes(q);
        if (!matchSupplier && !matchInvoice && !matchStartedBy && !matchCreatedBy) return false;
      }

      return true;
    });
  }, [conferences, filterStatus, filterCreatedBy, filterSearch]);

  const createdByOptions = useMemo(() => {
    const users = [...new Set(conferences.map((c) => c.createdBy).filter(Boolean))] as string[];
    return users.sort();
  }, [conferences]);

  useEffect(() => {
    getNFeConferences().then((data) => {
      const filtered =
        user === "admin"
          ? data
          : data.filter((conf) => conf.createdBy === user);
      setConferences(filtered);
      setLoading(false);
    });
  }, [user]);

  const handleDeleteClick = (e: React.MouseEvent, conf: NFeConference) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteTarget(conf);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    if (getEffectiveConferenceStatus(deleteTarget) === "encerrado") {
      setDeleteTarget(null);
      return;
    }
    await deleteNFeConference(deleteTarget.id);
    setConferences((prev) => prev.filter((c) => c.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  useEffect(() => {
    if (!statusEditId) return;
    const handleClick = () => setStatusEditId(null);
    const t = setTimeout(() => document.addEventListener("click", handleClick), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("click", handleClick);
    };
  }, [statusEditId]);

  const handleStatusChange = async (conf: NFeConference, newStatus: NFeConferenceStatus) => {
    if (user !== "admin") return;
    const full = await getNFeConference(conf.id);
    if (!full) return;
    const updated = { ...full, status: newStatus };
    await saveNFeConference(updated);
    setConferences((prev) => prev.map((c) => (c.id === conf.id ? updated : c)));
    setStatusEditId(null);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--background)]">
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface)]/95 pt-[env(safe-area-inset-top)] backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-4">
          <Link
            href="/nfe"
            className="flex shrink-0 items-center gap-1 text-[var(--secondary)] transition-colors duration-200 hover:text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 rounded-lg px-2 py-1 -ml-2"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar
          </Link>
          <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold text-[var(--foreground)]">
            Conferências NFe
          </h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="flex-1 p-4">
        <div className="mx-auto max-w-2xl space-y-4">
          <Link
            href="/nfe"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 font-semibold text-[var(--primary-foreground)] transition-all duration-200 hover:bg-[var(--primary-hover)] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
          >
            <FileText className="h-5 w-5" />
            Nova conferência
          </Link>

          {!loading && conferences.length > 0 && user === "admin" && (
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
                      ({filteredConferences.length} de {conferences.length})
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
                    placeholder="Buscar por fornecedor, Nº nota, conferente..."
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    className="w-full rounded-lg border-2 border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted)] transition-colors focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                  />
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-[var(--muted)] self-center">Status:</span>
                    {(["todos", "em_andamento", "em_analise", "concluida", "encerrado"] as const).map((s) => (
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
                  {user === "admin" && createdByOptions.length > 0 && (
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
          ) : conferences.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--surface)] p-12 text-center">
              <p className="text-[var(--secondary)]">
                Nenhuma conferência salva. Importe uma NFe para começar.
              </p>
              <Link
                href="/nfe"
                className="mt-4 inline-block font-medium text-[var(--accent)] transition-colors hover:text-[var(--accent-hover)]"
              >
                Importar NFe →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredConferences
                .sort(
                  (a, b) =>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                )
                .map((conf) => {
                  const products = conf.products ?? [];
                  const status = getEffectiveConferenceStatus(conf);
                  const canDelete = status !== "encerrado";
                  const { className: statusClass } = statusConfig[status];
                  const totalExpected = products
                    .filter((p) => p.expectedQty > 0)
                    .reduce((s, p) => s + p.expectedQty, 0);
                  const totalCounted = products.reduce(
                    (s, p) => s + p.countedQty,
                    0
                  );
                  const formattedDate = formatDate(conf.createdAt);

                  return (
                    <div
                      key={conf.id}
                      className="group relative rounded-xl bg-[var(--surface)] border border-[var(--border)]/60 p-4 transition-all duration-200 hover:border-[var(--border)] hover:shadow-lg"
                    >
                      <Link
                        href={`/nfe/conference/${conf.id}`}
                        className="block -m-4 p-4"
                      >
                        {/* Linha 1: Título + Tag criador (admin) + Status */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0 flex-1 flex flex-wrap items-center gap-2">
                            <h3 className="min-w-0 font-semibold text-[var(--foreground)] text-sm leading-tight line-clamp-2">
                              {conf.supplierName}
                              {conf.observation && (
                                <MessageSquare className="inline-block ml-1 h-3.5 w-3.5 text-[var(--muted)] align-middle" aria-label="Tem observação" />
                              )}
                            </h3>
                            {user === "admin" && conf.createdBy && (
                              <span
                                className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                                  conf.createdBy.toLowerCase() === "leblon"
                                    ? "border-pink-500/40 bg-pink-500/15 text-pink-600 dark:text-pink-400"
                                    : conf.createdBy.toLowerCase() === "ipanema"
                                      ? "border-purple-500/40 bg-purple-500/15 text-purple-600 dark:text-purple-400"
                                      : "border-[var(--border)] bg-[var(--surface-hover)] text-[var(--secondary)]"
                                }`}
                              >
                                {conf.createdBy}
                              </span>
                            )}
                          </div>
                          {user === "admin" ? (
                            <div className="relative shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setStatusEditId(statusEditId === conf.id ? null : conf.id);
                                }}
                                className={`nfe-status-badge inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-sm font-medium whitespace-nowrap transition-colors hover:opacity-90 ${statusClass}`}
                              >
                                {statusLabel[status] ?? "—"}
                                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                              </button>
                              {statusEditId === conf.id && (
                                <div
                                  className="absolute right-0 top-full z-50 mt-1 min-w-[140px] rounded-lg border-2 border-[var(--border)] bg-[var(--surface)] py-1 shadow-xl"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {(["em_andamento", "em_analise", "concluida", "encerrado"] as ConferenceStatus[]).map((s) => (
                                    <button
                                      key={s}
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleStatusChange(conf, s);
                                      }}
                                      className={`block w-full px-3 py-2 text-left text-sm font-medium hover:bg-[var(--surface-hover)] ${
                                        s === status ? "bg-[var(--accent)]/10 text-[var(--accent)]" : "text-[var(--foreground)]"
                                      }`}
                                    >
                                      {statusLabel[s]}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span
                              className={`nfe-status-badge inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-sm font-medium whitespace-nowrap ${statusClass}`}
                            >
                              {statusLabel[status] ?? "—"}
                            </span>
                          )}
                        </div>

                        {/* Linha 2: Data + Nº */}
                        <div className="flex items-center gap-2 text-xs text-[var(--muted)] mb-2">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          <span>{formattedDate}</span>
                          <span className="text-[var(--border)]">•</span>
                          <span className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => handleCopyNumber(e, conf.id, conf.invoiceNumber)}
                              className="flex items-center gap-1 font-mono text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
                              title={copiedId === conf.id ? "Copiado" : "Copiar"}
                            >
                              Nº {conf.invoiceNumber}
                              <Copy className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
                            </button>
                            {copiedId === conf.id && (
                              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400" title="Copiado">
                                Copiado
                              </span>
                            )}
                          </span>
                        </div>

                        {/* Linha 3: Produtos + Itens + Usuário + Delete */}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border)]/50">
                          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-xs font-medium">
                            <span className="flex items-center gap-1 text-[var(--muted)]">
                              <Package className="h-3.5 w-3.5 shrink-0" />
                              <span className="text-[var(--foreground)]">{products.length}</span> produtos
                            </span>
                            <span className="text-[var(--muted)]">
                              <span className="text-[var(--foreground)]">{totalCounted}</span>/{totalExpected} itens
                            </span>
                            {conf.startedBy && (
                              <span className="flex items-center gap-1 text-[var(--muted)]">
                                <User className="h-3.5 w-3.5 shrink-0" />
                                {conf.startedBy}
                              </span>
                            )}
                          </div>
                          {canDelete && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteClick(e, conf)}
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 transition-colors hover:bg-red-500/20"
                              aria-label="Excluir conferência"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </Link>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </main>

      <ConfirmDeleteDrawer
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Excluir conferência?"
        message={
          deleteTarget
            ? `Excluir a conferência "${deleteTarget.supplierName}" (Nº ${deleteTarget.invoiceNumber})? Esta ação não pode ser desfeita.`
            : undefined
        }
        confirmLabel="Excluir"
        loadingLabel="Excluindo..."
      />
    </div>
  );
}
