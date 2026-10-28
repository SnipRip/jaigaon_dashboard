import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";

interface FilterChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected: boolean;
}

/** One option of a row of filter buttons; the chosen one is raised. */
export function FilterChip({ selected, className, ...props }: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={clsx(
        "glass-press h-11 rounded-full px-4 text-[13px] font-bold",
        selected ? "glass-selected" : "glass-control text-ink-soft hover:bg-white/80",
        className,
      )}
      {...props}
    />
  );
}
