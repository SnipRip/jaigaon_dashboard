"use client";

import { Tooltip as RadixTooltip } from "radix-ui";
import { useState, type ReactNode } from "react";

/**
 * Wrap the app once so tooltips share one delay: the first waits, the next
 * one along a row opens at once. Tooltips only ever label their control, so
 * the pointer never needs to reach them; they close as soon as it leaves.
 */
export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <RadixTooltip.Provider delayDuration={300} skipDelayDuration={400} disableHoverableContent>
      {children}
    </RadixTooltip.Provider>
  );
}

interface TooltipProps {
  label: string;
  side?: "top" | "right" | "bottom" | "left";
  /** Shows nothing, without unmounting the control it wraps. */
  disabled?: boolean;
  children: ReactNode;
}

// A hint for icon-only controls, in place of the browser's `title`. The
// control still needs its own `aria-label`.
//
// Open state is held here and never set while disabled: otherwise Radix
// marks a disabled tooltip open on hover, nothing ever closes it (there is
// no content to leave), and every link hovered on the expanded sidebar pops
// up at once when the sidebar folds to its icon rail.
export function Tooltip({ label, side = "top", disabled, children }: TooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <RadixTooltip.Root open={open && !disabled} onOpenChange={(next) => setOpen(next && !disabled)}>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      {!disabled && (
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side={side}
            sideOffset={10}
            collisionPadding={12}
            className="glass-popover z-30 max-w-[260px] origin-(--radix-tooltip-content-transform-origin) animate-tooltip-in [border-radius:6px] px-2.5 py-1.5 text-xs leading-snug font-medium text-ink data-[side=bottom]:[--tooltip-y:-4px] data-[side=left]:[--tooltip-x:4px] data-[side=right]:[--tooltip-x:-4px] data-[side=top]:[--tooltip-y:4px]"
          >
            {label}
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      )}
    </RadixTooltip.Root>
  );
}
