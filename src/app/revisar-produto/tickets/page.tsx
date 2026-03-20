"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Clock,
  Copy,
  ListTodo,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { ConfirmDeleteDrawer } from "@/components/ConfirmDeleteDrawer";
import {
  deleteProductTicket,
  loadProductTickets,
  updateProductTicketStatus,
} from "@/lib/product-tickets";
import type { ProductTicket, ProductTicketStatus } from "@/types/product-ticket";

const statusLabel: Record<ProductTicketStatus, string> = {
  em_aberto: "Em aberto",
  concluido: "Concluído",
};

function CreatorTag({ createdBy }: { createdBy?: string }) {
  if (!createdBy?.trim()) return null;
  const u = createdBy.toLowerCase();
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        u === "leblon"
          ? "border-pink-500/40 bg-pink-500/15 text-pink-600 dark:text-pink-400"
          : u === "ipanema"
            ? "border-purple-500/40 bg-purple-500/15 text-purple-600 dark:text-purple-400"
            : "border-[var(--border)] bg-[var(--surface-hover)] text-[var(--secondary)]"
      }`}
    >
      {createdBy}
    </span>
  );
}

/** Mesmo padrão da conferência NFe: copiar EAN + tooltip nativo + “Copiado”. */
function CopyableEanLine({
  ean,
  copied,
  onCopy,
}: {
  ean: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-[var(--foreground)]">
      <span className="text-[var(--muted)]">EAN:</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          void navigator.clipboard.writeText(ean);
          onCopy();
        }}
        className="inline-flex min-h-5 items-center gap-1.5 rounded font-mono text-[13px] text-[var(--foreground)] transition-colors hover:text-[var(--accent)]"
        title={copied ? "Copiado" : "Copiar EAN"}
        aria-label={copied ? "EAN copiado" : "Copiar EAN"}
      >
        {ean}
        <Copy className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
      </button>
      {copied ? (
        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400" title="Copiado">
          Copiado
        </span>
      ) : null}
    </p>
  );
}

function StatusBadge({ status }: { status: ProductTicketStatus }) {
  const open = status === "em_aberto";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        open
          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
          : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
      }`}
    >
      {open ? (
        <CircleDashed className="h-3 w-3" />
      ) : (
        <CheckCircle2 className="h-3 w-3" />
      )}
      {statusLabel[status]}
    </span>
  );
}

export default function RevisarProdutoTicketsPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<ProductTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"todos" | ProductTicketStatus>("todos");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; ean: string } | null>(null);
  /** Concluídos: expandido para ver fotos/detalhes; padrão recolhido (minimizado). */
  const [doneExpanded, setDoneExpanded] = useState<Record<string, boolean>>({});
  const [copiedTicketId, setCopiedTicketId] = useState<string | null>(null);

  const handleEanCopied = useCallback((ticketId: string) => {
    setCopiedTicketId(ticketId);
    window.setTimeout(() => setCopiedTicketId(null), 2000);
  }, []);

  const ticketItemRefs = useRef<Map<string, HTMLLIElement>>(new Map());

  const hasExpandedDoneTicket = useMemo(
    () =>
      tickets.some((t) => t.status === "concluido" && doneExpanded[t.id] === true),
    [tickets, doneExpanded],
  );

  useEffect(() => {
    if (!hasExpandedDoneTicket) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (target.closest('[aria-modal="true"]')) return;
      if (target.closest(".fixed.inset-0.z-50")) return;

      setDoneExpanded((prev) => {
        const next = { ...prev };
        let changed = false;
        for (const id of Object.keys(prev)) {
          if (!prev[id]) continue;
          const ticket = tickets.find((x) => x.id === id);
          if (ticket?.status !== "concluido") continue;
          const node = ticketItemRefs.current.get(id);
          if (node?.contains(target)) continue;
          next[id] = false;
          changed = true;
        }
        return changed ? next : prev;
      });
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [hasExpandedDoneTicket, tickets]);

  useEffect(() => {
    if (!lightboxSrc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxSrc(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxSrc]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await loadProductTickets(user);
      setTickets(list);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered =
    filter === "todos" ? tickets : tickets.filter((t) => t.status === filter);

  const openCount = tickets.filter((t) => t.status === "em_aberto").length;
  const doneCount = tickets.filter((t) => t.status === "concluido").length;

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--background)]">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/95 pt-[env(safe-area-inset-top)] backdrop-blur-sm">
        <div className="mx-auto max-w-lg px-4 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-[var(--secondary)] transition-colors hover:text-[var(--foreground)]"
            >
              <ArrowLeft className="h-5 w-5 shrink-0" />
              <span className="text-sm font-medium">Início</span>
            </Link>
          </div>
          <div className="mt-4 flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-hover)] text-[var(--primary)]">
              <ListTodo className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
                Tickets de revisão
              </h1>
              <p className="mt-0.5 text-sm text-[var(--muted)]">
                {user === "admin"
                  ? "Todas as lojas · "
                  : user
                    ? `Sua loja (${user}) · `
                    : ""}
                {openCount} em aberto · {doneCount} concluídos · {tickets.length} total
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <Link
          href="/revisar-produto"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-3.5 text-sm font-semibold text-[var(--primary-foreground)] shadow-sm transition-opacity hover:opacity-95 active:scale-[0.99]"
        >
          <Plus className="h-5 w-5 shrink-0" aria-hidden />
          Criar Ticket
        </Link>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["todos", "Todos"],
              ["em_aberto", "Em aberto"],
              ["concluido", "Concluídos"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === key
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-[var(--muted)]">Carregando…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-10 text-center">
            <p className="text-sm text-[var(--muted)]">
              {tickets.length === 0
                ? "Nenhum ticket ainda. Registre em Revisar Produto."
                : "Nenhum ticket neste filtro."}
            </p>
            <Link
              href="/revisar-produto"
              className="mt-3 inline-block text-sm font-medium text-[var(--accent)] hover:underline"
            >
              Abrir novo ticket
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {filtered.map((t) => {
              const isDone = t.status === "concluido";
              const showFull = !isDone || doneExpanded[t.id] === true;

              return (
                <li
                  key={t.id}
                  ref={(el) => {
                    if (el) ticketItemRefs.current.set(t.id, el);
                    else ticketItemRefs.current.delete(t.id);
                  }}
                  className="group relative rounded-2xl border border-[var(--border)]/70 bg-[var(--surface)] p-5 shadow-sm transition-all duration-200 hover:border-[var(--border)] hover:shadow-lg"
                >
                  {isDone && !showFull ? (
                    <>
                      <div
                        role="button"
                        tabIndex={0}
                        className="flex w-full cursor-pointer gap-3 rounded-xl text-left outline-none transition-colors hover:bg-[var(--surface-hover)]/50 focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                        aria-expanded="false"
                        aria-label="Ver fotos e detalhes do ticket"
                        onClick={() => setDoneExpanded((prev) => ({ ...prev, [t.id]: true }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setDoneExpanded((prev) => ({ ...prev, [t.id]: true }));
                          }
                        }}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-hover)]">
                          <CheckCircle2
                            className="h-5 w-5 text-emerald-600 dark:text-emerald-400"
                            aria-hidden
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex items-start justify-between gap-3">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                              {user === "admin" && <CreatorTag createdBy={t.createdBy} />}
                            </div>
                            <StatusBadge status={t.status} />
                          </div>
                          {t.funcionario ? (
                            <>
                              <p className="mt-1 truncate text-sm text-[var(--foreground)]">
                                <span className="text-[var(--muted)]">Criado por:</span>{" "}
                                <span>{t.funcionario}</span>
                              </p>
                              <CopyableEanLine
                                ean={t.ean}
                                copied={copiedTicketId === t.id}
                                onCopy={() => handleEanCopied(t.id)}
                              />
                            </>
                          ) : (
                            <CopyableEanLine
                              ean={t.ean}
                              copied={copiedTicketId === t.id}
                              onCopy={() => handleEanCopied(t.id)}
                            />
                          )}
                          <div className="mt-2 flex items-center gap-1.5 text-sm text-[var(--muted)]">
                            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            <span>
                              {new Date(t.createdAt).toLocaleString("pt-BR", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </span>
                          </div>
                        </div>
                        <ChevronDown
                          className="h-5 w-5 shrink-0 self-center text-[var(--muted)]"
                          aria-hidden
                        />
                      </div>
                      <div
                        data-ticket-actions
                        className="mt-4 flex flex-wrap justify-end gap-2 border-t border-[var(--border)]/50 pt-4"
                      >
                        <button
                          type="button"
                          disabled={busyId === t.id}
                          onClick={() => {
                            void (async () => {
                              setBusyId(t.id);
                              try {
                                await updateProductTicketStatus(t.id, "em_aberto", user);
                                await refresh();
                              } finally {
                                setBusyId(null);
                              }
                            })();
                          }}
                          className="rounded-lg border border-[var(--border)] bg-[var(--surface-hover)] px-3 py-2 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface)] disabled:opacity-50"
                        >
                          Reabrir
                        </button>
                        <button
                          type="button"
                          disabled={busyId === t.id}
                          onClick={() => setDeleteConfirm({ id: t.id, ean: t.ean })}
                          className="rounded-lg border border-red-500/30 px-3 py-2 text-xs font-medium text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                        >
                          <Trash2 className="inline h-3.5 w-3.5" /> Excluir
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {isDone && (
                        <div className="mb-4 flex items-center gap-2 border-b border-[var(--border)]/50 pb-4">
                          <button
                            type="button"
                            onClick={() =>
                              setDoneExpanded((prev) => ({ ...prev, [t.id]: false }))
                            }
                            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-[var(--muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
                            aria-expanded="true"
                            aria-label="Recolher"
                          >
                            <ChevronDown className="h-4 w-4 rotate-180" />
                            Recolher
                          </button>
                        </div>
                      )}
                      <div className="flex gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-hover)]">
                          {t.status === "em_aberto" ? (
                            <CircleDashed
                              className="h-5 w-5 text-amber-600 dark:text-amber-400"
                              aria-hidden
                            />
                          ) : (
                            <CheckCircle2
                              className="h-5 w-5 text-emerald-600 dark:text-emerald-400"
                              aria-hidden
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex items-start justify-between gap-3">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                              {user === "admin" && <CreatorTag createdBy={t.createdBy} />}
                            </div>
                            <StatusBadge status={t.status} />
                          </div>
                          {t.funcionario ? (
                            <>
                              <p className="mt-1 truncate text-sm text-[var(--foreground)]">
                                <span className="text-[var(--muted)]">Criado por:</span>{" "}
                                <span>{t.funcionario}</span>
                              </p>
                              <CopyableEanLine
                                ean={t.ean}
                                copied={copiedTicketId === t.id}
                                onCopy={() => handleEanCopied(t.id)}
                              />
                            </>
                          ) : (
                            <CopyableEanLine
                              ean={t.ean}
                              copied={copiedTicketId === t.id}
                              onCopy={() => handleEanCopied(t.id)}
                            />
                          )}
                          <div className="mt-2 flex items-center gap-1.5 text-sm text-[var(--muted)]">
                            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            <span>
                              {new Date(t.createdAt).toLocaleString("pt-BR", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2 border-t border-[var(--border)]/50 pt-4">
                        <button
                          type="button"
                          onClick={() => setLightboxSrc(t.photoEan)}
                          className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[var(--border)] ring-offset-2 transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                          aria-label="Ampliar foto do EAN"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={t.photoEan}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => setLightboxSrc(t.photoProduto)}
                          className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[var(--border)] ring-offset-2 transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                          aria-label="Ampliar foto do produto"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={t.photoProduto}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </button>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--border)]/50 pt-4">
                        {t.status === "em_aberto" ? (
                          <button
                            type="button"
                            disabled={busyId === t.id}
                            onClick={() => {
                              void (async () => {
                                setBusyId(t.id);
                                try {
                                  await updateProductTicketStatus(t.id, "concluido", user);
                                  setDoneExpanded((prev) => ({ ...prev, [t.id]: false }));
                                  await refresh();
                                } finally {
                                  setBusyId(null);
                                }
                              })();
                            }}
                            className="rounded-lg bg-emerald-600/90 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
                          >
                            Marcar concluído
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={busyId === t.id}
                            onClick={() => {
                              void (async () => {
                                setBusyId(t.id);
                                try {
                                  await updateProductTicketStatus(t.id, "em_aberto", user);
                                  await refresh();
                                } finally {
                                  setBusyId(null);
                                }
                              })();
                            }}
                            className="rounded-lg border border-[var(--border)] bg-[var(--surface-hover)] px-3 py-2 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface)] disabled:opacity-50"
                          >
                            Reabrir
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={busyId === t.id}
                          onClick={() => setDeleteConfirm({ id: t.id, ean: t.ean })}
                          className="rounded-lg border border-red-500/30 px-3 py-2 text-xs font-medium text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                        >
                          <Trash2 className="inline h-3.5 w-3.5" /> Excluir
                        </button>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <ConfirmDeleteDrawer
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={async () => {
          if (!deleteConfirm) return;
          setBusyId(deleteConfirm.id);
          try {
            await deleteProductTicket(deleteConfirm.id, user);
            await refresh();
          } finally {
            setBusyId(null);
          }
        }}
        title="Excluir ticket?"
        message={
          deleteConfirm
            ? `O ticket do EAN ${deleteConfirm.ean} será removido. Esta ação não pode ser desfeita.`
            : ""
        }
        confirmLabel="Excluir"
        loadingLabel="Excluindo…"
      />

      {lightboxSrc ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Visualização da imagem"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]"
          onClick={() => setLightboxSrc(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxSrc(null)}
            className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition hover:bg-white/20"
            aria-label="Fechar"
          >
            <X className="h-6 w-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxSrc}
            alt=""
            className="max-h-[min(90dvh,100%)] max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
}
