"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { saveInventory } from "@/lib/storage";
import { useAuth } from "@/components/AuthProvider";
import type { Inventory } from "@/types/inventory";

interface StartInventoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StartInventoryDrawer({ isOpen, onClose }: StartInventoryDrawerProps) {
  const { user, userId, lojaId } = useAuth();
  const [name, setName] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setIsVisible(true);
    } else {
      setIsVisible(false);
      setIsClosing(true);
      const timer = setTimeout(() => setIsClosing(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isVisible && isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [isVisible, isOpen]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    const inventory: Inventory = {
      id: crypto.randomUUID(),
      name: trimmed,
      createdAt: new Date().toISOString(),
      items: [],
      status: "em_contagem",
      lojaId: lojaId ?? undefined,
      usuarioId: userId ?? undefined,
      lojaUsername: !userId ? (user ?? undefined) : undefined,
    };

    await saveInventory(inventory);
    setName("");
    onClose();
    router.push(`/inventory/${inventory.id}`);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleClose();
  };

  if (!isOpen && !isClosing) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col justify-end transition-[visibility] duration-300 ${
        isVisible ? "visible" : "invisible"
      }`}
    >
      <div
        onClick={handleBackdropClick}
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        className={`relative rounded-t-3xl border-t-2 border-x-2 border-[var(--border)] bg-[var(--surface)] p-6 pb-8 shadow-2xl transition-transform duration-300 ease-out ${
          isVisible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="absolute left-1/2 top-3 h-1 w-12 -translate-x-1/2 rounded-full bg-[var(--muted)]" />
        <h2 className="mb-4 mt-2 text-xl font-semibold text-[var(--foreground)]">
          Novo Inventário
        </h2>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.toUpperCase())}
            placeholder="Nome do Inventário"
            className="mb-4 w-full rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-base uppercase placeholder:normal-case text-[var(--foreground)] placeholder-[var(--muted)] transition-colors focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
            autoFocus
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full rounded-xl bg-[var(--primary)] py-3 font-semibold text-[var(--primary-foreground)] transition-all duration-200 hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Iniciar
          </button>
        </form>
      </div>
    </div>
  );
}
