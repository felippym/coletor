"use client";

import { useState } from "react";
import { APP_NAME } from "@/lib/app-brand";

interface LoginOverlayProps {
  onLogin: (username: string, password: string) => Promise<boolean>;
}

export function LoginOverlay({ onLogin }: LoginOverlayProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const ok = await onLogin(username, password);
      if (!ok) {
        setError("Usuário ou senha inválidos");
      }
    } catch {
      setError("Erro ao conectar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop com blur */}
      <div
        className="absolute inset-0 bg-[var(--background)]/80 backdrop-blur-md"
        aria-hidden
      />
      {/* Card de login centralizado */}
      <div className="relative w-full max-w-sm rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <img
            src="/logo.png"
            alt={APP_NAME}
            className="logo mx-auto mb-3 h-24 w-auto object-contain sm:h-28"
          />
          <h1 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">{APP_NAME}</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="mb-1.5 block text-sm font-medium text-[var(--foreground)]"
            >
              Usuário
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="digite o seu usuário"
              autoComplete="username"
              autoCapitalize="off"
              autoCorrect="off"
              required
              disabled={loading}
              className="w-full rounded-xl border-2 border-[var(--border)] bg-[var(--background)] px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted)] transition-colors focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 disabled:opacity-60"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-[var(--foreground)]"
            >
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              disabled={loading}
              className="w-full rounded-xl border-2 border-[var(--border)] bg-[var(--background)] px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted)] transition-colors focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 disabled:opacity-60"
            />
          </div>
          {error && (
            <p className="text-sm text-[var(--destructive)]" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-[var(--primary)] font-semibold text-[var(--primary-foreground)] transition-all duration-200 hover:bg-[var(--primary-hover)] disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--surface)]"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
