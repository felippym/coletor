"use client";

import { useEffect, useState } from "react";
import { getProdutoByCodigo } from "@/lib/produtos";

interface ScanConfirmationProps {
  ean: string;
  quantity: number;
  onComplete: () => void;
}

export function ScanConfirmation({ ean, quantity, onComplete }: ScanConfirmationProps) {
  const [visible, setVisible] = useState(true);
  const [produtoNome, setProdutoNome] = useState<string | null>(null);

  useEffect(() => {
    getProdutoByCodigo(ean).then((p) => setProdutoNome(p?.produto ?? null));
  }, [ean]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 300);
    }, 600);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-x-4 top-1/2 z-40 -translate-y-1/2 rounded-2xl bg-[var(--success)] px-6 py-5 text-center text-white shadow-xl transition-all duration-300 ${
        visible ? "opacity-100 scale-100" : "opacity-0 scale-95"
      }`}
    >
      <div className="flex items-center justify-center gap-2 text-2xl font-bold">
        <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Escaneado!
      </div>
      <div className="mt-2 text-lg font-medium">{produtoNome || ean}</div>
      {produtoNome && <div className="mt-0.5 font-mono text-sm opacity-90">{ean}</div>}
      <div className="mt-1 text-sm opacity-90">Quantidade: {quantity}</div>
    </div>
  );
}
