"use client";

import { useEffect, useState } from "react";

interface ScanConfirmationProps {
  ean: string;
  quantity: number;
  onComplete: () => void;
}

export function ScanConfirmation({ ean, quantity, onComplete }: ScanConfirmationProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 300);
    }, 600);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-x-4 top-1/2 z-40 -translate-y-1/2 rounded-2xl bg-emerald-500 px-6 py-4 text-center text-white shadow-lg transition-all duration-300 ${
        visible ? "opacity-100 scale-100" : "opacity-0 scale-95"
      }`}
    >
      <div className="text-2xl font-bold">✓ Escaneado!</div>
      <div className="mt-1 font-mono text-lg">{ean}</div>
      <div className="mt-1 text-sm opacity-90">Quantidade: {quantity}</div>
    </div>
  );
}
