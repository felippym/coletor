"use client";

import { useState, useEffect, useRef, useId } from "react";
import { useRouter } from "next/navigation";
import { saveInventory } from "@/lib/storage";
import { FuncionarioPicker, type FuncionarioPickerStats } from "@/components/FuncionarioPicker";
import type { Inventory } from "@/types/inventory";

interface StartInventoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  createdBy?: string | null;
}

export function StartInventoryDrawer({ isOpen, onClose, createdBy }: StartInventoryDrawerProps) {
  const baseId = useId();
  const funcionarioFieldId = `${baseId}-funcionario`;

  const [name, setName] = useState("");
  const [funcionario, setFuncionario] = useState("");
  const [fp, setFp] = useState<FuncionarioPickerStats>({ loading: true, count: 0 });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setIsVisible(true);
      setName("");
      setFuncionario("");
      setSubmitError(null);
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

  const funcionarioOk = fp.count === 0 ? false : funcionario.trim().length > 0;

  const canSubmit =
    name.trim().length > 0 && !fp.loading && fp.count > 0 && funcionarioOk;

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const trimmed = name.trim();
    if (!trimmed) return;

    if (!funcionarioOk) {
      setSubmitError(
        fp.count === 0
          ? "Cadastre pelo menos um funcionário em Usuários antes de iniciar."
          : "Selecione o funcionário.",
      );
      return;
    }

    const inventory: Inventory = {
      id: crypto.randomUUID(),
      name: trimmed,
      createdAt: new Date().toISOString(),
      items: [],
      status: "em_contagem",
      createdBy: createdBy ?? undefined,
      funcionario: funcionario.trim(),
    };

    await saveInventory(inventory);
    setName("");
    setFuncionario("");
    onClose();
    router.push(`/inventory/${inventory.id}`);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleClose();
  };

  if (!isOpen && !isClosing) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col justify-end overflow-visible transition-[visibility] duration-300 ${
        isVisible ? "visible" : "invisible"
      }`}
    >
      <div
        onClick={handleBackdropClick}
        className={`absolute inset-0 z-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        data-suppress-barcode-focus
        className={`relative z-10 overflow-visible rounded-t-3xl border-t-2 border-x-2 border-[var(--border)] bg-[var(--surface)] p-6 pb-8 shadow-2xl transition-transform duration-300 ease-out ${
          isVisible ? "" : "translate-y-full"
        }`}
      >
        <div className="absolute left-1/2 top-3 h-1 w-12 -translate-x-1/2 rounded-full bg-[var(--muted)]" />
        <h2 className="mb-4 mt-2 text-xl font-semibold text-[var(--foreground)]">
          Novo Inventário
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-visible" noValidate>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value.toUpperCase());
              setSubmitError(null);
            }}
            placeholder="Nome do Inventário"
            className="w-full rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-base uppercase placeholder:normal-case text-[var(--foreground)] placeholder-[var(--muted)] transition-colors focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
            autoFocus
          />

          <FuncionarioPicker
            viewerUser={createdBy}
            fetchEnabled={isOpen}
            value={funcionario}
            onChange={(v) => {
              setFuncionario(v);
              setSubmitError(null);
            }}
            fieldId={funcionarioFieldId}
            description="Quem está realizando a contagem."
            onStatsChange={setFp}
            suppressBarcodeFocus
          />

          {submitError ? (
            <p className="text-sm text-red-400" role="alert">
              {submitError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-xl bg-[var(--primary)] py-3 font-semibold text-[var(--primary-foreground)] transition-all duration-200 hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Iniciar
          </button>
        </form>
      </div>
    </div>
  );
}
