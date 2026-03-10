"use client";

import { useState, useEffect } from "react";

interface ConfirmDeleteDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  message?: string;
}

export function ConfirmDeleteDrawer({
  isOpen,
  onClose,
  onConfirm,
  title = "Excluir inventário?",
  message = "Esta ação não pode ser desfeita.",
}: ConfirmDeleteDrawerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300);
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      handleClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) handleClose();
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
        <h2 className="mb-2 mt-2 text-xl font-semibold text-[var(--foreground)]">{title}</h2>
        <p className="mb-6 text-[var(--secondary)]">{message}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1 rounded-xl border-2 border-[var(--border)] py-3 font-semibold text-[var(--foreground)] transition-all duration-200 hover:bg-[var(--surface-hover)] disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 rounded-xl bg-[var(--destructive)] py-3 font-semibold text-white transition-all duration-200 hover:bg-[var(--destructive-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Excluindo..." : "Excluir"}
          </button>
        </div>
      </div>
    </div>
  );
}
