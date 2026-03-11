"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";

const MIGRATION_SQL = `-- Adiciona coluna status aos inventários
alter table public.inventories
  add column if not exists status text not null default 'em_contagem';`;

export default function MigratePage() {
  const { user } = useAuth();
  const [result, setResult] = useState<{ ok?: boolean; message?: string; error?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleRun = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/db/migrate", { method: "POST" });
      const data = await res.json();
      setResult(res.ok ? { ok: true, message: data.message } : { error: data.error });
    } catch (e) {
      setResult({ error: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(MIGRATION_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (user !== "admin") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center p-4">
        <p className="text-[var(--destructive)]">Acesso negado. Apenas admin.</p>
        <Link href="/inventories" className="mt-4 text-[var(--accent)]">
          Voltar
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <Link href="/inventories" className="text-sm text-[var(--secondary)] hover:text-[var(--foreground)]">
        ← Voltar
      </Link>
      <h1 className="mt-4 text-xl font-semibold text-[var(--foreground)]">
        Migração: coluna status
      </h1>
      <p className="mt-2 text-sm text-[var(--secondary)]">
        Adiciona a coluna <code className="rounded bg-[var(--surface)] px-1">status</code> na tabela de inventários.
      </p>

      <div className="mt-6 space-y-4">
        <div className="rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] p-4">
          <pre className="overflow-x-auto text-xs text-[var(--foreground)]">{MIGRATION_SQL}</pre>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleCopy}
              className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)]"
            >
              {copied ? "Copiado!" : "Copiar SQL"}
            </button>
            <a
              href="https://supabase.com/dashboard/project/_/sql/new"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border-2 border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--surface-hover)]"
            >
              Abrir Supabase SQL Editor
            </a>
          </div>
        </div>

        <div className="rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            Executar automaticamente
          </h2>
          <p className="mt-1 text-xs text-[var(--secondary)]">
            Requer DATABASE_URL no .env.local (Connection string do Supabase)
          </p>
          <button
            onClick={handleRun}
            disabled={loading}
            className="mt-3 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] disabled:opacity-50"
          >
            {loading ? "Executando…" : "Executar migração"}
          </button>
          {result && (
            <p
              className={`mt-3 text-sm ${result.ok ? "text-[var(--success)]" : "text-[var(--destructive)]"}`}
            >
              {result.ok ? result.message : result.error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
