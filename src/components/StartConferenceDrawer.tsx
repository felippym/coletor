"use client";

import { useState, useEffect, useId } from "react";
import { FuncionarioPicker, type FuncionarioPickerStats } from "@/components/FuncionarioPicker";

interface StartConferenceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (employeeName: string) => void | Promise<void>;
  isLoading?: boolean;
  createdBy?: string | null;
  title?: string;
  confirmLabel?: string;
  loadingLabel?: string;
}

export function StartConferenceDrawer({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  createdBy,
  title = "Finalizar conferência",
  confirmLabel = "Confirmar e Consultar",
  loadingLabel = "Consultando...",
}: StartConferenceDrawerProps) {
  const baseId = useId();
  const funcionarioFieldId = `${baseId}-funcionario`;

  const [funcionario, setFuncionario] = useState("");
  const [fp, setFp] = useState<FuncionarioPickerStats>({ loading: true, count: 0 });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setIsVisible(true);
      setFuncionario("");
      setSubmitError(null);
    } else {
      setIsVisible(false);
      setIsClosing(true);
      const timer = setTimeout(() => setIsClosing(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const funcionarioOk = fp.count === 0 ? false : funcionario.trim().length > 0;

  const canSubmit =
    !isLoading && !fp.loading && fp.count > 0 && funcionarioOk;

  const handleClose = () => {
    if (isLoading) return;
    setIsVisible(false);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (isLoading) return;

    if (!funcionarioOk) {
      setSubmitError(
        fp.count === 0
          ? "Cadastre pelo menos um funcionário em Usuários antes de finalizar."
          : "Selecione o funcionário.",
      );
      return;
    }

    const trimmed = funcionario.trim();
    try {
      await onConfirm(trimmed);
      setFuncionario("");
    } catch {
      setIsVisible(false);
      setTimeout(() => {
        setIsClosing(false);
        onClose();
      }, 300);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) handleClose();
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
        <h2 className="mb-4 mt-2 text-xl font-semibold text-[var(--foreground)]">{title}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-visible" noValidate>
          <FuncionarioPicker
            viewerUser={createdBy}
            fetchEnabled={isOpen}
            value={funcionario}
            onChange={(v) => {
              setFuncionario(v);
              setSubmitError(null);
            }}
            fieldId={funcionarioFieldId}
            description="Quem está finalizando a conferência."
            disabled={isLoading}
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
            {isLoading ? (
              <>
                <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--primary-foreground)] border-t-transparent" />
                {loadingLabel}
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
