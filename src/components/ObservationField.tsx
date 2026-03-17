"use client";

import { useState } from "react";
import { Plus, MessageSquare } from "lucide-react";

interface ObservationFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function ObservationField({ value, onChange, placeholder = "Adicione uma observação...", className }: ObservationFieldProps) {
  const [showField, setShowField] = useState(false);

  return (
    <div className={className ?? ""}>
      {showField ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <label className="flex items-center gap-2 text-sm font-medium text-[var(--muted)]">
              <MessageSquare className="h-4 w-4" />
              Observação
            </label>
            <button
              type="button"
              onClick={() => setShowField(false)}
              className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Ocultar
            </button>
          </div>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={2}
            autoFocus
            className="scrollbar-thin w-full rounded-lg border-2 border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted)] transition-colors focus:border-[var(--accent)] focus:outline-none resize-none"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowField(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--muted)] transition-colors hover:border-[var(--accent)]/50 hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface-hover)] text-[var(--muted)]">
            <Plus className="h-4 w-4" strokeWidth={2.5} />
          </span>
          Observação
        </button>
      )}
    </div>
  );
}
