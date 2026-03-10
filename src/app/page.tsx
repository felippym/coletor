"use client";

import { useState } from "react";
import Link from "next/link";
import { StartInventoryModal } from "@/components/StartInventoryModal";

export default function Home() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4 py-8">
      <main className="flex w-full max-w-md flex-col items-center gap-12">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="rounded-2xl bg-[var(--accent)]/10 p-4">
            <svg
              className="h-12 w-12 text-[var(--accent)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
              />
            </svg>
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
            onClick={() => setShowModal(true)}
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
      <StartInventoryModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}
