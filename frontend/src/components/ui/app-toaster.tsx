"use client";

import { CircleAlert, CircleCheck } from "lucide-react";
import { Toaster } from "sonner";

// The one place toasts appear (Sonner), mounted in the root layout. Styled as
// the popover glass so a toast reads like the rest of the dashboard. Every
// FormMessage raises one, so screens need no toast calls of their own.
export function AppToaster() {
  return (
    <Toaster
      position="bottom-right"
      closeButton
      // An open dialog turns pointer events off on the page; toasts over it stay clickable.
      style={{ pointerEvents: "auto" }}
      icons={{
        success: <CircleCheck aria-hidden="true" className="size-4 text-success" />,
        error: <CircleAlert aria-hidden="true" className="size-4 text-danger" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "glass-popover relative flex w-[356px] max-w-[calc(100vw-32px)] items-start gap-2.5 [border-radius:12px] px-3.5 py-3 text-[13px] font-medium text-ink",
          icon: "mt-px shrink-0",
          content: "min-w-0 flex-1",
          closeButton:
            "absolute! top-1.5! right-1.5! left-auto! flex size-6 items-center justify-center rounded-(--radius-control) text-muted hover:bg-ink/5 hover:text-ink",
          error: "text-danger-strong",
          success: "text-ink",
        },
      }}
    />
  );
}
