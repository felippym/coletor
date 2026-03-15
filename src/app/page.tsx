"use client";

import { useState } from "react";
import Link from "next/link";
import { StartInventoryDrawer } from "@/components/StartInventoryDrawer";
import { useAuth } from "@/components/AuthProvider";

export default function Home() {
  const [showDrawer, setShowDrawer] = useState(false);
  const { user, logout } = useAuth();

  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-[var(--background)]">
      <main className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-4">
        <div className="flex w-full max-w-md flex-col items-center gap-4 sm:gap-6">
          <div className="flex flex-col items-center gap-4 text-center sm:gap-6">
            <div className="rounded-2xl bg-[var(--surface)] p-3 shadow-sm sm:p-4">
              <img
                src="/logo.png"
                alt="Cutelaria do ISAÍAS"
                className="logo h-20 w-auto object-contain sm:h-28"
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
              Inventário de Loja
            </h1>
            <p className="max-w-sm text-sm leading-relaxed text-[var(--secondary)] sm:text-base">
              Conte o estoque usando a câmera do celular ou um leitor de código de barras Bluetooth.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:gap-4">
            <button
              onClick={() => setShowDrawer(true)}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-6 py-3 font-semibold text-[var(--primary-foreground)] transition-all duration-200 hover:bg-[var(--primary-hover)] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--background)] sm:h-14"
            >
              Iniciar Inventário
            </button>
            {user === "admin" && (
              <>
                <Link
                  href="/nfe"
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] px-6 py-3 font-semibold text-[var(--foreground)] transition-all duration-200 hover:bg-[var(--surface-hover)] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--background)] sm:h-14"
                >
                  Conferir NFe
                </Link>
                <Link
                  href="/nfe/conferences"
                  className="flex h-12 w-full items-center justify-center rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] px-6 py-3 font-semibold text-[var(--foreground)] transition-all duration-200 hover:bg-[var(--surface-hover)] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--background)] sm:h-14"
                >
                  Ver Conferências
                </Link>
              </>
            )}
            <Link
              href="/inventories"
              className="flex h-12 w-full items-center justify-center rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] px-6 py-3 font-semibold text-[var(--foreground)] transition-all duration-200 hover:bg-[var(--surface-hover)] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--background)] sm:h-14"
            >
              Ver Inventários
            </Link>
          </div>
        </div>
      </main>
      <footer className="flex shrink-0 flex-col items-center gap-1 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-center text-sm text-[var(--secondary)] sm:gap-2 sm:py-6 sm:pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        {user && (
          <button
            onClick={logout}
            className="text-[var(--muted)] underline-offset-2 hover:underline hover:text-[var(--foreground)]"
          >
            Sair ({user})
          </button>
        )}
        <span>desenvolvido por Felippy 🚀</span>
      </footer>
      <StartInventoryDrawer isOpen={showDrawer} onClose={() => setShowDrawer(false)} />
    </div>
  );
}
