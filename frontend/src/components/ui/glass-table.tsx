import clsx from "clsx";
import type { TableHTMLAttributes } from "react";

// A table of figures inside a glass panel. It scrolls sideways on a narrow
// screen instead of squeezing its columns, so give it a `min-w-*` class.
// The wrapper reaches 12px past the panel's padding on each side, which lets
// the row highlight run wider than the text while the text stays aligned
// with the card title. `relative` keeps absolutely placed children (an
// `sr-only` heading) inside the scroll box instead of widening the page.
export function GlassTable({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="relative -mx-2.5 overflow-x-auto">
      <table className={clsx("glass-table w-full text-[13px]", className)} {...props} />
    </div>
  );
}
