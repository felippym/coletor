"use client";

export function Skeleton({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-lg bg-[var(--border)]/40 animate-skeleton-pulse ${className}`}
      aria-hidden
      {...props}
    />
  );
}

/** Skeleton para página de detalhe (inventário, conferência NFe) */
export function SkeletonDetailPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-[var(--background)]">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/95 pt-[env(safe-area-inset-top)] backdrop-blur-sm">
        <div className="mx-auto max-w-2xl px-4 py-4 pr-20">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-6 w-16 ml-auto" />
          </div>
          <div className="mt-3 flex gap-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="sticky top-0 z-20 shrink-0 space-y-4 border-b border-[var(--border)] bg-[var(--background)] p-4">
          <div className="mx-auto max-w-2xl">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="mt-4 h-12 w-full rounded-2xl" />
            <Skeleton className="mt-4 h-12 w-full rounded-xl" />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="mx-auto max-w-2xl space-y-4 p-4">
            <div className="overflow-hidden rounded-xl border border-[var(--border)]/60 bg-[var(--surface)]">
              <div className="border-b border-[var(--border)]/50 px-4 py-3">
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="space-y-3 p-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
                  </div>
                ))}
              </div>
            </div>
            <Skeleton className="h-14 w-full rounded-2xl" />
          </div>
        </div>
      </main>
    </div>
  );
}

/** Skeleton para lista de usuários (página /users) */
export function SkeletonUserList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
        >
          <Skeleton className="h-4 w-24" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Skeleton para lista de cards (inventários, conferências) */
export function SkeletonCardList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-[var(--border)]/60 bg-[var(--surface)] p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <div className="flex gap-3">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <div className="flex gap-4">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </div>
            <Skeleton className="h-6 w-20 rounded-full shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Um card no formato da consulta fiscal (produto / classificação / tributação) */
export function SkeletonFiscalResultCard() {
  const Section = ({
    lines,
  }: {
    lines: { w: string }[];
  }) => (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <Skeleton className="h-4 w-4 shrink-0 rounded" />
        <Skeleton className="h-3 w-28" />
      </div>
      <ul className="space-y-1.5">
        {lines.map((line, i) => (
          <li key={i} className="pl-4">
            <Skeleton className={`h-3.5 ${line.w}`} />
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <div
      className="rounded-2xl border border-[var(--border)]/70 bg-[var(--surface)] p-5 shadow-sm"
      aria-hidden
    >
      <div className="space-y-5">
        <Section lines={[{ w: "w-40" }, { w: "w-full max-w-md" }]} />
        <div className="h-px bg-[var(--border)]/60" />
        <Section lines={[{ w: "w-32" }, { w: "w-28" }]} />
        <div className="h-px bg-[var(--border)]/60" />
        <Section
          lines={[{ w: "w-16" }, { w: "w-full max-w-sm" }, { w: "w-12" }, { w: "w-10" }]}
        />
      </div>
    </div>
  );
}

/** Placeholder enquanto a busca fiscal carrega */
export function SkeletonFiscalConsultResults({ count = 2 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonFiscalResultCard key={i} />
      ))}
    </div>
  );
}
