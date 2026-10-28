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
  /** The large brand-bordered field a screen is built around. */
  prominent?: boolean;
  className?: string;
}

// A search input with its own clear button (the browser's is hidden in
// globals.css).
export function SearchField({ id, label, value, onChange, placeholder, trailing, prominent, className }: SearchFieldProps) {
  return (
    <div
      className={clsx(
        "glass-field flex items-center gap-3 px-5",
        prominent ? "h-[50px] border-2 border-brand" : "h-11",
        className,
      )}
    >
      <Search aria-hidden="true" className={clsx("size-5 shrink-0", prominent ? "text-brand" : "text-muted")} />
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={clsx(
          "h-10 min-w-0 flex-1 bg-transparent font-semibold outline-none placeholder:font-medium placeholder:text-muted",
          prominent ? "text-[15px]" : "text-sm",
        )}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-ink/5 hover:text-ink"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      )}
      {trailing && <span className="text-xs font-bold whitespace-nowrap text-muted">{trailing}</span>}
    </div>
  );
}
