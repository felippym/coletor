"use client";

import { useRef, useEffect } from "react";

interface HiddenBarcodeInputProps {
  onScan: (ean: string) => void;
  disabled?: boolean;
}

export function HiddenBarcodeInput({ onScan, disabled }: HiddenBarcodeInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const bufferRef = useRef("");

  useEffect(() => {
    const input = inputRef.current;
    if (!input || disabled) return;

    const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) return;

    const shouldNotStealFocus = () => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return false;
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON") {
        return true;
      }
      if (el.isContentEditable) return true;
      if (el.closest("[data-suppress-barcode-focus]")) return true;
      if (el.closest('[role="dialog"]')) return true;
      return false;
    };

    const focusInput = () => {
      if (shouldNotStealFocus()) return;
      input.focus();
    };
    focusInput();
    window.addEventListener("click", focusInput);
    const onBlur = () => {
      requestAnimationFrame(() => {
        if (!document.activeElement || document.activeElement === document.body) {
          input.focus();
        }
      });
    };
    document.addEventListener("focusout", onBlur);
    return () => {
      window.removeEventListener("click", focusInput);
      document.removeEventListener("focusout", onBlur);
    };
  }, [disabled]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === "Enter") {
      e.preventDefault();
      const value = bufferRef.current.trim();
      if (value) {
        onScan(value);
        bufferRef.current = "";
        if (inputRef.current) inputRef.current.value = "";
      }
      return;
    }

    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      bufferRef.current += e.key;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    bufferRef.current = e.target.value;
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      autoCapitalize="off"
      autoCorrect="off"
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      className="absolute h-0 w-0 opacity-0 pointer-events-none"
      tabIndex={-1}
      aria-hidden
    />
  );
}
