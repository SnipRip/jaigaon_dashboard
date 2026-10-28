"use client";

import { Tooltip as RadixTooltip } from "radix-ui";
import type { ReactNode } from "react";

/** Wrap the app once so tooltips share one delay. */
export const TooltipProvider = RadixTooltip.Provider;

interface TooltipProps {
  label: string;
  side?: "top" | "right" | "bottom" | "left";
  /** Shows nothing, without unmounting the control it wraps. */
  disabled?: boolean;
  children: ReactNode;
}

// A styled hint for icon-only controls, used in place of the browser's
// `title` tooltip. The control still needs its own `aria-label`.
export function Tooltip({ label, side = "top", disabled, children }: TooltipProps) {
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      {!disabled && (
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side={side}
            sideOffset={8}
            className="z-30 rounded-full border border-white/20 bg-ink/80 px-3 py-1.5 text-xs font-bold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_8px_24px_rgb(20_40_90/0.3)] backdrop-blur-md"
          >
            {label}
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      )}
    </RadixTooltip.Root>
  );
}
