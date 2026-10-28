import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";

interface FilterChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected: boolean;
}

/** One option of a FilterGroup; the chosen one is a raised white segment. */
export function FilterChip({ selected, className, ...props }: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={clsx(
        "inline-flex h-[26px] items-center gap-1.5 rounded-md px-2.5 text-[12.5px] whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-55",
        selected ? "glass-selected font-semibold text-ink" : "font-medium text-muted hover:bg-white/50 hover:text-ink",
        className,
      )}
      {...props}
    />
  );
}
