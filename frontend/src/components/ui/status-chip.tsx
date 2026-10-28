import clsx from "clsx";
import type { ReactNode } from "react";

export type StatusTone = "brand" | "success" | "warning" | "danger" | "neutral";

const TONES: Record<StatusTone, string> = {
  brand: "bg-brand-tint text-brand-strong",
  success: "bg-success-tint text-success-strong",
  warning: "bg-warning-tint text-warning-strong",
  danger: "bg-danger-tint text-danger-strong",
  neutral: "bg-neutral-tint text-ink-soft",
};

/** Text colour only, for a status written inline without a pill. */
export const STATUS_TEXT: Record<StatusTone, string> = {
  brand: "text-brand-strong",
  success: "text-success-strong",
  warning: "text-warning-strong",
  danger: "text-danger-strong",
  neutral: "text-ink-soft",
};

export function StatusChip({ tone, children }: { tone: StatusTone; children: ReactNode }) {
  return (
    <span className={clsx("inline-flex h-5 items-center gap-1.5 rounded-[5px] px-1.5 text-[11.5px] font-semibold whitespace-nowrap before:size-1.5 before:rounded-full before:bg-current", TONES[tone])}>
      {children}
    </span>
  );
}
