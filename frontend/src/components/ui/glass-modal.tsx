"use client";

import { X } from "lucide-react";
import { Dialog } from "radix-ui";
import type { ReactNode } from "react";

interface GlassModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** One line under the title saying what the dialog is for. */
  description?: string;
  children: ReactNode;
  /** Buttons, right-aligned along the bottom. */
  footer?: ReactNode;
}

// A dialog floating over the page (Radix Dialog: focus is trapped inside,
// Escape and a click outside close it). The sheet is the dense popover glass
// and the page behind is dimmed, not blurred a second time, so text in the
// dialog stays sharp and opening it costs one blur layer, not two.
export function GlassModal({ open, onOpenChange, title, description, children, footer }: GlassModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-30 animate-fade-in bg-ink/35" />
        <div className="pointer-events-none fixed inset-0 z-30 flex items-end justify-center p-3 sm:items-center sm:p-6">
          <Dialog.Content className="glass-popover pointer-events-auto flex max-h-full w-full max-w-[480px] animate-pop-in flex-col gap-3.5 overflow-y-auto [border-radius:12px] px-[18px] py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-0.5">
                <Dialog.Title className="text-[15px] leading-tight font-semibold">{title}</Dialog.Title>
                {description && (
                  <Dialog.Description className="text-xs text-muted">{description}</Dialog.Description>
                )}
              </div>
              <Dialog.Close
                aria-label="Close"
                className="-mt-1 -mr-1.5 flex size-8 shrink-0 items-center justify-center rounded-(--radius-control) text-muted hover:bg-ink/5 hover:text-ink"
              >
                <X aria-hidden="true" className="size-4" />
              </Dialog.Close>
            </div>
            {children}
            {footer && <div className="-mx-[18px] -mb-4 flex flex-wrap justify-end gap-2 border-t border-line bg-ink/[0.025] px-[18px] py-3">{footer}</div>}
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
