"use client";

import { useState } from "react";
import Link from "next/link";
import { StartInventoryDrawer } from "@/components/StartInventoryDrawer";

export default function Home() {
  const [showDrawer, setShowDrawer] = useState(false);

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center bg-[var(--background)] px-4 py-8">
      <main className="flex w-full max-w-md flex-col items-center gap-12">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="rounded-2xl bg-[var(--surface)] p-4 shadow-sm">
            <img
              src="/logo.png"
              alt="Cutelaria do ISAÍAS"
              className="logo h-24 w-auto object-contain sm:h-32"
            />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
            Inventário de Loja
          </h1>
          <p className="max-w-sm text-base leading-relaxed text-[var(--secondary)]">
            Conte o estoque usando a câmera do celular ou um leitor de código de barras Bluetooth.
          </p>
        </div>

        <div className="flex w-full flex-col gap-4">
          <button
            onClick={() => setShowDrawer(true)}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-6 py-3 font-semibold text-[var(--primary-foreground)] transition-all duration-200 hover:bg-[var(--primary-hover)] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
          >
            Iniciar Inventário
          </button>
          <Link
            href="/inventories"
            className="flex h-14 w-full items-center justify-center rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] px-6 py-3 font-semibold text-[var(--foreground)] transition-all duration-200 hover:bg-[var(--surface-hover)] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
          >
            Ver Inventários
          </Link>
        </div>
      </main>
      <footer className="absolute bottom-0 left-0 right-0 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-center text-sm text-[var(--secondary)]">
        desenvolvido por Felippy
      </footer>
      <StartInventoryDrawer isOpen={showDrawer} onClose={() => setShowDrawer(false)} />
    </div>
  );
}
