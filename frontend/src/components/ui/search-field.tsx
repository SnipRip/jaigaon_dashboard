"use client";

import clsx from "clsx";
import { Search, X } from "lucide-react";
import type { ReactNode } from "react";

interface SearchFieldProps {
  id: string;
  /** Read by screen readers; the field shows `placeholder` instead. */
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Shown at the right edge, e.g. "12 of 48". */
  trailing?: ReactNode;
  /** The larger brand-bordered field a screen is built around. */
  prominent?: boolean;
  className?: string;
}

// A search input with its own clear button (the browser's is hidden in
// globals.css).
export function SearchField({ id, label, value, onChange, placeholder, trailing, prominent, className }: SearchFieldProps) {
  return (
    <div
      className={clsx(
        "glass-field flex items-center gap-2 px-2.5",
        prominent ? "h-10 border-brand shadow-[0_0_0_3px_rgb(11_77_187/0.12)]" : "h-8",
        className,
      )}
    >
      <Search aria-hidden="true" className={clsx("size-4 shrink-0", prominent ? "text-brand" : "text-muted")} />
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={clsx("h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted", prominent ? "text-sm" : "text-[13px]")}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted hover:bg-ink/5 hover:text-ink"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      )}
      {trailing && <span className="text-xs whitespace-nowrap text-muted">{trailing}</span>}
    </div>
  );
}
