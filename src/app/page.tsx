"use client";

import { useState } from "react";
import Link from "next/link";
import { StartInventoryModal } from "@/components/StartInventoryModal";

export default function Home() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <div className="w-full" />
        <div className="flex flex-col items-center gap-8 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Inventário de Loja
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Conte o estoque usando a câmera do celular ou um leitor de código de barras Bluetooth.
          </p>
        </div>
        <div className="flex w-full flex-col gap-4">
          <button
            onClick={() => setShowModal(true)}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-zinc-900 px-5 text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Iniciar Inventário
          </button>
          <Link
            href="/inventories"
            className="flex h-14 w-full items-center justify-center rounded-full border border-zinc-200 px-5 text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            Ver Inventários
          </Link>
        </div>
      </main>
      <StartInventoryModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}
