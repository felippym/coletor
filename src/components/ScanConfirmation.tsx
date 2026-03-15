"use client";

import { useEffect, useState } from "react";
import { getProdutoByCodigo } from "@/lib/produtos";
import { playScanSound, playScanErrorSound } from "@/lib/scan-sound";

interface ScanConfirmationProps {
  ean: string;
  quantity: number;
  onComplete: () => void;
  /** Nome do produto (ex: da NFe) - evita consulta ao catálogo */
  productName?: string | null;
}

export function ScanConfirmation({ ean, quantity, onComplete, productName: productNameProp }: ScanConfirmationProps) {
  const [visible, setVisible] = useState(true);
  const [produtoNome, setProdutoNome] = useState<string | null>(productNameProp ?? null);
  const [loaded, setLoaded] = useState(!!productNameProp);

  useEffect(() => {
    if (productNameProp != null) {
      setProdutoNome(productNameProp);
      setLoaded(true);
      playScanSound();
      return;
    }
    getProdutoByCodigo(ean).then((p) => {
      const nome = p?.produto ?? null;
      setProdutoNome(nome);
      setLoaded(true);
      if (nome?.trim()) {
        playScanSound();
      } else {
        playScanErrorSound();
      }
    });
  }, [ean, productNameProp]);

  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 300);
    }, 600);
    return () => clearTimeout(timer);
  }, [loaded, onComplete]);

  const cadastrado = !!produtoNome?.trim();
  const bgColor = cadastrado ? "bg-[var(--success)]" : "bg-[var(--destructive)]";

  if (!loaded) return null;

  return (
    <div
      className={`fixed inset-x-4 top-1/2 z-40 -translate-y-1/2 rounded-2xl px-6 py-5 text-center text-white shadow-xl transition-all duration-300 ${bgColor} ${
        visible ? "opacity-100 scale-100" : "opacity-0 scale-95"
      }`}
    >
      <div className="flex items-center justify-center gap-2 text-2xl font-bold">
        <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Escaneado!
      </div>
      <div className="mt-2 text-lg font-medium">{produtoNome?.trim() || "NÃO CADASTRADO"}</div>
      <div className="mt-0.5 font-mono text-sm opacity-90">{ean}</div>
      <div className="mt-1 text-sm opacity-90">Quantidade: {quantity}</div>
    </div>
  );
}
