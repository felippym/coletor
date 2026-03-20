"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, ListTodo, Repeat2, Upload } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { FuncionarioPicker, type FuncionarioPickerStats } from "@/components/FuncionarioPicker";
import { compressImageFile, saveProductTicket } from "@/lib/product-tickets";
import type { ProductTicket } from "@/types/product-ticket";

function PhotoSlot({
  id,
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: ReactNode;
  hint: string;
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    try {
      const dataUrl = await compressImageFile(file);
      onChange(dataUrl);
    } catch {
      onChange(null);
    }
  };

  return (
    <div className="space-y-2">
      <div>
        <label htmlFor={id} className="text-sm font-medium text-[var(--foreground)]">
          {label}
        </label>
        <p className="text-xs text-[var(--muted)]">{hint}</p>
      </div>
      <input
        id={id}
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={pick}
        disabled={disabled}
      />
      {value ? (
        <div className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-hover)]/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt=""
            className="max-h-56 w-full object-contain"
          />
          <div className="flex gap-2 border-t border-[var(--border)]/60 bg-[var(--surface)] p-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-hover)]/50 py-2 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-50"
            >
              <Camera className="h-4 w-4" />
              Tirar outra
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(null)}
              className="rounded-lg border border-red-500/30 px-3 py-2 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-50"
            >
              Remover
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-10 text-[var(--muted)] transition-colors hover:border-[var(--primary)]/50 hover:bg-[var(--surface-hover)]/50 disabled:opacity-50"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
            <Upload className="h-5 w-5 text-[var(--primary)]" />
            Adicionar foto
          </div>
          <span className="text-xs">Câmera ou galeria</span>
        </button>
      )}
    </div>
  );
}

export default function RevisarProdutoPage() {
  const router = useRouter();
  const { user } = useAuth();
  const baseId = useId();
  const eanId = `${baseId}-ean`;
  const funcionarioFieldId = `${baseId}-funcionario`;

  const [funcionario, setFuncionario] = useState("");
  const [fp, setFp] = useState<FuncionarioPickerStats>({ loading: true, count: 0 });

  const [ean, setEan] = useState("");
  const [photoEan, setPhotoEan] = useState<string | null>(null);
  const [photoProduto, setPhotoProduto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "err"; text: string } | null>(null);

  const funcionarioOk = fp.count === 0 ? false : funcionario.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!funcionarioOk) {
      setMessage({
        type: "err",
        text:
          fp.count === 0
            ? "Cadastre pelo menos um funcionário em Usuários antes de registrar."
            : "Selecione o funcionário.",
      });
      return;
    }
    if (!ean.trim()) {
      setMessage({ type: "err", text: "Informe o EAN." });
      return;
    }
    if (!photoEan) {
      setMessage({ type: "err", text: "Adicione a foto do código de barras (EAN)." });
      return;
    }
    if (!photoProduto) {
      setMessage({ type: "err", text: "Adicione a foto do produto." });
      return;
    }
    if (saving) return;
    const photoEanVal = photoEan;
    const photoProdutoVal = photoProduto;
    setSaving(true);
    try {
      const ticket: ProductTicket = {
        id: crypto.randomUUID(),
        funcionario: funcionario.trim(),
        ean: ean.trim(),
        photoEan: photoEanVal,
        photoProduto: photoProdutoVal,
        createdAt: new Date().toISOString(),
        status: "em_aberto",
        createdBy: user?.trim().toLowerCase() || undefined,
      };
      await saveProductTicket(ticket, user);
      setFuncionario("");
      setEan("");
      setPhotoEan(null);
      setPhotoProduto(null);
      router.push("/revisar-produto/tickets");
    } catch {
      setMessage({
        type: "err",
        text: "Não foi possível salvar. Verifique o espaço do navegador.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--background)]">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/95 pt-[env(safe-area-inset-top)] backdrop-blur-sm">
        <div className="mx-auto max-w-lg px-4 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-[var(--secondary)] transition-colors hover:text-[var(--foreground)]"
            >
              <ArrowLeft className="h-5 w-5 shrink-0" />
              <span className="text-sm font-medium">Início</span>
            </Link>
          </div>
          <div className="mt-4 flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-hover)] text-[var(--primary)]">
              <Repeat2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
                Revisar Produto
              </h1>
              <p className="mt-0.5 text-sm text-[var(--muted)]">
                Registre o funcionário, o EAN e duas fotos para abrir um ticket de conferência. Todos os
                campos são obrigatórios.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <Link
          href="/revisar-produto/tickets"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 text-sm font-semibold text-[var(--foreground)] shadow-sm transition-colors hover:border-[var(--primary)]/40 hover:bg-[var(--surface-hover)] active:scale-[0.99]"
        >
          <ListTodo className="h-5 w-5 shrink-0 text-[var(--primary)]" aria-hidden />
          Ver tickets
        </Link>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
          <p className="text-xs text-[var(--muted)]">
            Campos marcados com <span className="text-red-400">*</span> são obrigatórios.
          </p>
          <FuncionarioPicker
            viewerUser={user}
            fetchEnabled
            value={funcionario}
            onChange={setFuncionario}
            fieldId={funcionarioFieldId}
            description="Quem está registrando este ticket."
            disabled={saving}
            onStatsChange={setFp}
          />

          <div className="space-y-2">
            <label htmlFor={eanId} className="text-sm font-medium text-[var(--foreground)]">
              EAN <span className="text-red-400" aria-hidden>*</span>
            </label>
            <input
              id={eanId}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Código de barras do produto"
              value={ean}
              onChange={(ev) => setEan(ev.target.value.replace(/\s/g, ""))}
              required
              aria-required="true"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 font-mono text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            />
          </div>

          <PhotoSlot
            id={`${baseId}-p1`}
            label={
              <>
                Foto 1 — EAN / código de barras <span className="text-red-400" aria-hidden>*</span>
              </>
            }
            hint="Enquadre o código de barras (EAN) na embalagem ou etiqueta."
            value={photoEan}
            onChange={setPhotoEan}
            disabled={saving}
          />

          <PhotoSlot
            id={`${baseId}-p2`}
            label={
              <>
                Foto 2 — produto (frente) <span className="text-red-400" aria-hidden>*</span>
              </>
            }
            hint="Fotografe o produto de forma que dê para identificar modelo e embalagem."
            value={photoProduto}
            onChange={setPhotoProduto}
            disabled={saving}
          />

          {message && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
            >
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-[var(--primary)] px-4 py-3.5 text-sm font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? "Salvando…" : "Registrar ticket"}
          </button>
        </form>
      </main>
    </div>
  );
}
