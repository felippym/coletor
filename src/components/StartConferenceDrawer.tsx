"use client";

import { useState, useEffect, useRef } from "react";

interface StartConferenceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (employeeName: string) => void | Promise<void>;
  isLoading?: boolean;
}

export function StartConferenceDrawer({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: StartConferenceDrawerProps) {
  const [name, setName] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setIsVisible(true);
      setName("");
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
    if (isLoading) return;
    setIsVisible(false);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || isLoading) return;

    try {
      await onConfirm(trimmed);
      setName("");
      handleClose();
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
          Digite o seu nome
        </h2>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do funcionário"
            disabled={isLoading}
            className="mb-4 w-full rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-base text-[var(--foreground)] placeholder-[var(--muted)] transition-colors focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 disabled:opacity-50"
            autoFocus
          />
          <button
            type="submit"
            disabled={!name.trim() || isLoading}
            className="w-full rounded-xl bg-[var(--primary)] py-3 font-semibold text-[var(--primary-foreground)] transition-all duration-200 hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
              {isLoading ? (
                <>
                  <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--primary-foreground)] border-t-transparent" />
                  Consultando...
                </>
              ) : (
                "Confirmar e Consultar"
              )}
            </button>
        </form>
      </div>
    </div>
  );
}
