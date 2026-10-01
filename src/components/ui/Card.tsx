import type { PropsWithChildren } from "react";

export function Card({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={`rounded-xl border border-border bg-surface p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function Tooltip({ texto, children }: PropsWithChildren<{ texto: string }>) {
  return (
    <span className="group relative inline-flex items-center gap-1">
      {children}
      <span
        tabIndex={0}
        aria-label={texto}
        className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-border text-[10px] text-ink-muted focus-ring"
      >
        i
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-56 -translate-x-1/2 rounded-lg border border-border bg-surface p-2 text-xs text-ink-muted opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {texto}
      </span>
    </span>
  );
}
