"use client";

import clsx from "clsx";
import { useEffect } from "react";
import { toast } from "sonner";

interface FormMessageProps {
  tone: "success" | "error";
  children: string;
  /**
   * A standing notice (a warning, "cancelled", no access, could not load)
   * rather than the result of an action: shown inline only, never toasted.
   */
  persistent?: boolean;
  /**
   * The state object the message came from ({ tone, text }). Each action sets
   * a new one, so the same text a second time ("Saved." twice) still toasts.
   */
  result?: object;
}

/**
 * The result of an action: saved, or what went wrong. Every result is a
 * toast; an error also stays inline under the form so it is there while it
 * is fixed. The toast id is the text, so a remount (and React's double
 * effects in development) refreshes one toast instead of stacking.
 */
export function FormMessage({ tone, children, persistent, result }: FormMessageProps) {
  useEffect(() => {
    if (persistent) return;
    toast[tone](children, { id: `${tone}:${children}` });
  }, [tone, children, persistent, result]);

  if (tone === "success" && !persistent) return null;
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={clsx(
        "rounded-(--radius-tile) px-3 py-2 text-[13px] font-medium",
        tone === "error" ? "bg-danger-tint text-danger-strong" : "bg-success-tint text-success-strong",
      )}
    >
      {children}
    </p>
  );
}
