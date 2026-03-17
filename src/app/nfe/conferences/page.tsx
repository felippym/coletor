"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Clock, Package, MessageSquare, Trash2, User } from "lucide-react";
import { getNFeConferences, deleteNFeConference } from "@/lib/nfe-storage";
import { useAuth } from "@/components/AuthProvider";
import { SkeletonCardList } from "@/components/Skeleton";
import { ConfirmDeleteDrawer } from "@/components/ConfirmDeleteDrawer";
import type { NFeConference, NFeProduct } from "@/types/nfe";

type ConferenceStatus = "nao_iniciada" | "em_andamento" | "concluida";

function getConferenceStatus(products: NFeProduct[]): ConferenceStatus {
  const totalCounted = products.reduce((s, p) => s + p.countedQty, 0);
  if (totalCounted === 0) return "nao_iniciada";

  const nfeProducts = products.filter((p) => p.expectedQty > 0);
  const allMatch =
    nfeProducts.length > 0 &&
    nfeProducts.every((p) => p.countedQty === p.expectedQty);
  return allMatch ? "concluida" : "em_andamento";
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
  nao_iniciada: "Não iniciada",
  em_andamento: "Em andamento",
  concluida: "Concluída",
};

const statusConfig: Record<ConferenceStatus, { className: string }> = {
  nao_iniciada: {
    className: "bg-[var(--muted)]/20 text-[var(--muted)] border-[var(--border)]",
  },
  em_andamento: {
    className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  },
  concluida: {
    className: "bg-[var(--success)]/15 text-[var(--success)] border-[var(--success)]/30",
  },
};

export default function NFeConferencesPage() {
  const { user } = useAuth();
  const [conferences, setConferences] = useState<NFeConference[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<NFeConference | null>(null);

  useEffect(() => {
    getNFeConferences().then((data) => {
      setConferences(data);
      setLoading(false);
    });
  }, []);

  const handleDeleteClick = (e: React.MouseEvent, conf: NFeConference) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteTarget(conf);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteNFeConference(deleteTarget.id);
    setConferences((prev) => prev.filter((c) => c.id !== deleteTarget.id));
    setDeleteTarget(null);
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
              {conferences
                .sort(
                  (a, b) =>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                )
                .map((conf) => {
                  const status = getConferenceStatus(conf.products);
                  const { className: statusClass } = statusConfig[status];
                  const totalExpected = conf.products
                    .filter((p) => p.expectedQty > 0)
                    .reduce((s, p) => s + p.expectedQty, 0);
                  const totalCounted = conf.products.reduce(
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
                        {/* Linha 1: Título + Status */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="min-w-0 flex-1 font-semibold text-[var(--foreground)] text-sm leading-tight line-clamp-2">
                            {conf.supplierName}
                            {conf.observation && (
                              <MessageSquare className="inline-block ml-1 h-3.5 w-3.5 text-[var(--muted)] align-middle" aria-label="Tem observação" />
                            )}
                          </h3>
                          <span
                            className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusClass}`}
                          >
                            {statusLabel[status]}
                          </span>
                        </div>

                        {/* Linha 2: Data + Nº */}
                        <div className="flex items-center gap-2 text-xs text-[var(--muted)] mb-2">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          <span>{formattedDate}</span>
                          <span className="text-[var(--border)]">•</span>
                          <span>Nº {conf.invoiceNumber}</span>
                        </div>

                        {/* Linha 3: Produtos + Itens + Usuário + Delete */}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border)]/50">
                          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-xs font-medium">
                            <span className="flex items-center gap-1 text-[var(--muted)]">
                              <Package className="h-3.5 w-3.5 shrink-0" />
                              <span className="text-[var(--foreground)]">{conf.products.length}</span> produtos
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
                          {user === "admin" && (
                            <button
                              onClick={(e) => handleDeleteClick(e, conf)}
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--destructive)]/10 text-[var(--destructive)] transition-colors hover:bg-[var(--destructive)]/20"
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
