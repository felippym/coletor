"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { getProdutoByCodigo } from "@/lib/produtos";
import { playScanSound, playScanErrorSound } from "@/lib/scan-sound";
import { NFE_PRODUCT_NOT_ON_INVOICE } from "@/types/nfe";

interface ScanConfirmationProps {
  ean: string;
  quantity: number;
  onComplete: () => void;
  /** Nome do produto (ex: da NFe) - evita consulta ao catálogo */
  productName?: string | null;
  /** Chamado quando bloqueia/desbloqueia novos scans (ex: produto não listado por 3s) */
  onBlockingChange?: (blocking: boolean) => void;
}

const NOT_LISTED_DURATION_MS = 5000;

export function ScanConfirmation({ ean, quantity, onComplete, productName: productNameProp, onBlockingChange }: ScanConfirmationProps) {
  const [visible, setVisible] = useState(true);
  const [produtoNome, setProdutoNome] = useState<string | null>(productNameProp ?? null);
  const [loaded, setLoaded] = useState(!!productNameProp);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (productNameProp != null) {
      setProdutoNome(productNameProp);
      setLoaded(true);
      const notListed = productNameProp.trim() === NFE_PRODUCT_NOT_ON_INVOICE;
      if (notListed) playScanErrorSound();
      else playScanSound();
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
    const notInNfe = produtoNome?.trim() === NFE_PRODUCT_NOT_ON_INVOICE;
    const duration = notInNfe ? NOT_LISTED_DURATION_MS : 600;

    if (notInNfe) onBlockingChange?.(true);

    let count = 5;
    if (notInNfe) setCountdown(5);
    const interval = notInNfe
      ? setInterval(() => {
          count -= 1;
          setCountdown(count);
        }, 1000)
      : null;

    const timer = setTimeout(() => {
      if (notInNfe) onBlockingChange?.(false);
      setVisible(false);
      setTimeout(onComplete, 300);
    }, duration);

    return () => {
      clearTimeout(timer);
      if (interval) clearInterval(interval);
      if (notInNfe) onBlockingChange?.(false);
    };
  }, [loaded, produtoNome, onComplete, onBlockingChange]);

  const notInNfe = produtoNome?.trim() === NFE_PRODUCT_NOT_ON_INVOICE;
  const cadastrado = !!produtoNome?.trim() && !notInNfe;
  const bgColor = notInNfe || !cadastrado ? "bg-[var(--destructive)]" : "bg-[var(--success)]";

  if (!loaded) return null;

  return (
    <div
      className={`fixed inset-x-4 top-1/2 z-40 -translate-y-1/2 rounded-2xl px-6 py-5 text-center text-white shadow-xl transition-all duration-300 ${bgColor} ${
        visible ? "opacity-100 scale-100" : "opacity-0 scale-95"
      }`}
    >
      <div className="flex items-center justify-center gap-2 text-2xl font-bold">
        {notInNfe ? (
          <AlertTriangle className="h-7 w-7" />
        ) : (
          <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
        {notInNfe ? "Produto não listado!" : "Escaneado!"}
      </div>
      {notInNfe && countdown !== null && (
        <div className="mt-2 text-4xl font-bold tabular-nums">{countdown}</div>
      )}
      <div className="mt-2 text-lg font-medium">{produtoNome?.trim() || "NÃO CADASTRADO"}</div>
      <div className="mt-2 rounded-xl bg-white/30 px-4 py-3 font-mono text-xl font-bold tracking-widest shadow-inner">{ean}</div>
      <div className="mt-1 text-sm opacity-90">Quantidade: {quantity}</div>
    </div>
  );
}
