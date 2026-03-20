"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { ChevronDown, UserRound } from "lucide-react";
import { loadFuncionarioNames } from "@/lib/funcionarios";

export type FuncionarioPickerStats = { loading: boolean; count: number };

type FuncionarioPickerProps = {
  viewerUser: string | null | undefined;
  /** Só busca na API quando true (ex.: drawer aberto). */
  fetchEnabled: boolean;
  value: string;
  onChange: (name: string) => void;
  fieldId: string;
  description?: string;
  disabled?: boolean;
  onStatsChange?: (stats: FuncionarioPickerStats) => void;
  /** Marca região para o leitor de código de barras não roubar o foco. */
  suppressBarcodeFocus?: boolean;
  label?: string;
  /**
   * `above` = lista abre para cima (bottom sheet / drawer no rodapé).
   * `below` = padrão para formulários no meio da página.
   */
  listPlacement?: "below" | "above";
};

export function FuncionarioPicker({
  viewerUser,
  fetchEnabled,
  value,
  onChange,
  fieldId,
  description,
  disabled = false,
  onStatsChange,
  suppressBarcodeFocus = false,
  label = "Funcionário",
  listPlacement = "below",
}: FuncionarioPickerProps) {
  const [names, setNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(fetchEnabled);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const statsCbRef = useRef(onStatsChange);
  statsCbRef.current = onStatsChange;

  useEffect(() => {
    statsCbRef.current?.({ loading, count: names.length });
  }, [loading, names.length]);

  useEffect(() => {
    if (!fetchEnabled) return;
    let cancelled = false;
    setLoading(true);
    void loadFuncionarioNames(viewerUser ?? null)
      .then((n) => {
        if (!cancelled) {
          setNames(n);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNames([]);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [fetchEnabled, viewerUser]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const wrapProps = suppressBarcodeFocus
    ? ({ "data-suppress-barcode-focus": true } as const)
    : ({} as const);

  const placeholder = loading
    ? "Carregando funcionários…"
    : names.length === 0
      ? "Nenhum funcionário cadastrado"
      : "Selecione o funcionário";

  const blocked = disabled || loading || names.length === 0;

  /** Altura da lista: cabe todos os nomes até um teto (listas longas rolam). */
  const listHeightPx = useMemo(() => {
    const rowPx = 42;
    const listPadPx = 8;
    const maxPx = 320;
    return Math.min(names.length * rowPx + listPadPx, maxPx);
  }, [names.length]);

  return (
    <div ref={rootRef} className="space-y-2" {...wrapProps}>
      <label htmlFor={fieldId} className="text-sm font-medium text-[var(--foreground)]">
        {label} <span className="text-red-400" aria-hidden>*</span>
      </label>
      {description ? <p className="text-xs text-[var(--muted)]">{description}</p> : null}
      <div className="relative overflow-visible">
        <UserRound
          className="pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
          aria-hidden
        />
        <button
          type="button"
          id={fieldId}
          disabled={blocked}
          aria-expanded={open}
          aria-haspopup="listbox"
          onClick={() => {
            if (!blocked) setOpen((o) => !o);
          }}
          className="flex min-h-[46px] w-full items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] py-3 pl-10 pr-10 text-left text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className={value ? "truncate" : "truncate text-[var(--muted)]"}>
            {value || placeholder}
          </span>
        </button>
        <ChevronDown
          className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)] transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
        {open && names.length > 0 ? (
          <ul
            role="listbox"
            style={{ maxHeight: listHeightPx }}
            className={`absolute left-0 right-0 z-[100] overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg ${
              listPlacement === "above" ? "bottom-full mb-1" : "top-full mt-1"
            }`}
          >
            {names.map((nome) => (
              <li key={nome} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={value === nome}
                  className="w-full px-4 py-2.5 text-left text-sm text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(nome);
                    setOpen(false);
                  }}
                >
                  {nome}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {open && names.length > 0 && listPlacement === "below" ? (
        <div className="shrink-0" style={{ minHeight: listHeightPx }} aria-hidden />
      ) : null}
      {!loading && names.length === 0 ? (
        <p className="text-xs text-amber-200/90">
          {viewerUser === "admin" ? (
            <>
              Cadastre funcionários na tela{" "}
              <Link href="/users" className="font-medium text-[var(--accent)] underline underline-offset-2">
                Usuários
              </Link>
              .
            </>
          ) : (
            "Peça ao administrador para cadastrar os funcionários na tela Usuários."
          )}
        </p>
      ) : null}
    </div>
  );
}
