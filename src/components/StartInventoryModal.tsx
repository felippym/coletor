"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveInventory } from "@/lib/storage";
import type { Inventory } from "@/types/inventory";

interface StartInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StartInventoryModal({ isOpen, onClose }: StartInventoryModalProps) {
  const [name, setName] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    const inventory: Inventory = {
      id: crypto.randomUUID(),
      name: trimmed,
      createdAt: new Date().toISOString(),
      items: [],
    };

    await saveInventory(inventory);
    setName("");
    onClose();
    router.push(`/inventory/${inventory.id}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-semibold text-[var(--foreground)]">
          Novo Inventário
        </h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do inventário"
            className="mb-4 w-full rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-base text-[var(--foreground)] placeholder-[var(--muted)] transition-colors focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
            autoFocus
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border-2 border-[var(--border)] py-3 font-semibold text-[var(--foreground)] transition-all duration-200 hover:bg-[var(--surface-hover)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 rounded-xl bg-[var(--primary)] py-3 font-semibold text-[var(--primary-foreground)] transition-all duration-200 hover:bg-[var(--primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Iniciar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
