"use client";

import { useRef, useEffect, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

interface BarcodeScannerProps {
  onScan: (ean: string) => void;
  enabled?: boolean;
}

export function BarcodeScanner({ onScan, enabled = true }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const controlsRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    if (!enabled || !videoRef.current) return;

    const codeReader = new BrowserMultiFormatReader();
    const video = videoRef.current;

    const startScanning = async () => {
      try {
        setError(null);
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        const videoInput = devices[0];
        const deviceId = videoInput?.deviceId ?? undefined;

        controlsRef.current = await codeReader.decodeFromVideoDevice(
          deviceId ?? null,
          video,
          (result, err) => {
            if (result) {
              const text = result.getText().trim();
              if (text) onScan(text);
            }
          }
        );
        setIsActive(true);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erro ao acessar câmera"
        );
      }
    };

    startScanning();
    return () => {
      try {
        controlsRef.current?.stop?.();
      } catch {
        // ignore
      }
      setIsActive(false);
    };
  }, [enabled, onScan]);

  if (!enabled) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[var(--primary)]">
      <video
        ref={videoRef}
        className="aspect-square w-full object-cover"
        playsInline
        muted
      />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--primary)]/95 p-4 text-center text-sm text-[var(--destructive)]">
          {error}
        </div>
      )}
      {isActive && !error && (
        <div className="absolute inset-0 border-4 border-[var(--success)]/50 rounded-2xl pointer-events-none" />
      )}
    </div>
  );
}
