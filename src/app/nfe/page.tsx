"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText, KeyRound, List } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import {
  createNFeConferenceFromInvoice,
  saveNFeConference,
} from "@/lib/nfe-storage";
import type { NFeInvoice } from "@/types/nfe";

export default function NFeImportPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [mode, setMode] = useState<"chave" | "xml">("chave");
  const [chave, setChave] = useState("");
  const [xml, setXml] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [error]);

  const chaveDigits = chave.replace(/\D/g, "");
  const isValidChave = chaveDigits.length === 44;
  const hasXml = xml.trim().length > 100;

  const handleConsult = async () => {
    setError(null);
    setLoading(true);

    try {
      const body =
        mode === "xml"
          ? { xml: xml.trim() }
          : { chave: chaveDigits };

      const res = await fetch("/api/nfe/consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as NFeInvoice | { error?: string };

      if (!res.ok) {
        const errMsg = (data as { error?: string }).error ?? "Erro ao consultar NFe";
        setError(errMsg);
        setLoading(false);
        throw new Error(errMsg);
      }

      const invoice = data as NFeInvoice;
      const conference = createNFeConferenceFromInvoice(invoice, undefined, user ?? undefined);
      await saveNFeConference(conference);
      router.push(`/nfe/conference/${conference.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao processar");
      setLoading(false);
    }
  };

  const canSubmit =
    (mode === "chave" && isValidChave) || (mode === "xml" && hasXml);

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--background)]">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/95 pt-[env(safe-area-inset-top)] backdrop-blur-sm">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-[var(--secondary)] transition-colors hover:text-[var(--foreground)]"
            >
              <svg
                className="h-5 w-5 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <span>Voltar</span>
            </Link>
            <h1 className="flex-1 text-center text-xl font-semibold text-[var(--foreground)]">
              Importar NFe
            </h1>
            <div className="w-16" />
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col px-4 py-6">
        <div className="mx-auto w-full max-w-2xl space-y-6">
          <p className="text-sm text-[var(--secondary)]">
            Informe a chave de 44 dígitos da NFe ou cole o XML completo da nota
            para iniciar a conferência.
          </p>

          <Link
            href="/nfe/conferences"
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] px-6 py-3 font-medium text-[var(--foreground)] transition-all duration-200 hover:bg-[var(--surface-hover)] hover:border-[var(--accent)]/50"
          >
            <List className="h-5 w-5" />
            Ver Conferências
          </Link>

          <div className="flex gap-2 rounded-xl border-2 border-[var(--border)] p-1">
            <button
              type="button"
              onClick={() => setMode("chave")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
                mode === "chave"
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface-hover)]"
              }`}
            >
              <KeyRound className="h-4 w-4" />
              Chave
            </button>
            <button
              type="button"
              onClick={() => setMode("xml")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
                mode === "xml"
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface-hover)]"
              }`}
            >
              <FileText className="h-4 w-4" />
              XML
            </button>
          </div>

          {mode === "chave" ? (
            <div className="space-y-2">
              <label
                htmlFor="chave"
                className="block text-sm font-medium text-[var(--foreground)]"
              >
                Chave de acesso (44 dígitos)
              </label>
              <input
                id="chave"
                type="text"
                inputMode="numeric"
                maxLength={44}
                placeholder="Ex: 35240312345678000199550010000000011234567890"
                value={chave}
                onChange={(e) =>
                  setChave(e.target.value.replace(/\D/g, "").slice(0, 44))
                }
                className="w-full rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] px-4 py-3 font-mono text-base text-[var(--foreground)] placeholder-[var(--muted)] transition-colors focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
              />
              <p className="text-xs text-[var(--muted)]">
                {chaveDigits.length}/44 dígitos. Com certificado digital configurado
                (NFE_CERT_*), a consulta é feita direto na SEFAZ. Caso contrário, cole o XML.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <label
                htmlFor="xml"
                className="block text-sm font-medium text-[var(--foreground)]"
              >
                XML da NFe
              </label>
              <textarea
                id="xml"
                rows={8}
                placeholder="Cole aqui o conteúdo do arquivo XML da NFe..."
                value={xml}
                onChange={(e) => setXml(e.target.value)}
                className="w-full rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] px-4 py-3 font-mono text-sm text-[var(--foreground)] placeholder-[var(--muted)] transition-colors focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
              />
            </div>
          )}

          {error && (
            <div
              ref={errorRef}
              role="alert"
              className="rounded-xl border-2 border-[var(--destructive)]/50 bg-[var(--destructive)]/15 px-4 py-4 text-sm"
            >
              <p className="font-semibold text-[var(--destructive)]">Erro ao consultar</p>
              <p className="mt-1.5 max-h-32 overflow-y-auto break-words text-[var(--foreground)]">{error}</p>
              {error.includes("dest_cnpj") || error.includes("schema cache") ? (
                <p className="mt-2 text-xs text-[var(--secondary)]">
                  Execute a migração no Supabase: <code className="rounded bg-[var(--surface)] px-1 py-0.5">npm run db:migrate:nfe:open</code>
                </p>
              ) : null}
            </div>
          )}

          <button
            onClick={() => handleConsult()}
            disabled={!canSubmit || loading}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] font-semibold text-[var(--primary-foreground)] transition-all duration-200 hover:bg-[var(--primary-hover)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--primary-foreground)] border-t-transparent" />
                Consultando...
              </>
            ) : (
              "Consultar e Conferir"
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
