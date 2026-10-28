import clsx from "clsx";
import type { ReactNode } from "react";

export type StatusTone = "brand" | "success" | "warning" | "danger" | "neutral";

const TONES: Record<StatusTone, string> = {
  brand: "bg-brand-tint/75 text-brand-strong ring-brand/15",
  success: "bg-success-tint/75 text-success-strong ring-success/20",
  warning: "bg-warning-tint/75 text-warning-strong ring-warning/20",
  danger: "bg-danger-tint/75 text-danger-strong ring-danger/15",
  neutral: "bg-neutral-tint/75 text-ink-soft ring-ink/10",
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
    <span className={clsx("inline-block rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap ring-1 ring-inset", TONES[tone])}>
      {children}
    </span>
  );
}
