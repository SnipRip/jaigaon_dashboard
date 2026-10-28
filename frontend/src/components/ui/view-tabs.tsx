import clsx from "clsx";
import type { ReactNode } from "react";

export interface ViewTab<T extends string> {
  value: T;
  label: string;
  /** Shown in a small grey box after the label. */
  count?: ReactNode;
}

interface ViewTabsProps<T extends string> {
  label: string;
  tabs: readonly ViewTab<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

// Switches between whole views of one page (Payments: what customers owe,
// what we owe, receipts…). Underlined, so it reads differently from a
// filter (FilterGroup) and from a button.
export function ViewTabs<T extends string>({ label, tabs, value, onChange, className }: ViewTabsProps<T>) {
  return (
    <div role="tablist" aria-label={label} className={clsx("flex gap-1 overflow-x-auto overflow-y-hidden border-b border-line [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", className)}>
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={clsx(
              "inline-flex h-10 shrink-0 items-center gap-1.5 border-b-2 px-2.5 text-[13px] whitespace-nowrap transition-colors",
              active ? "border-brand font-semibold text-ink" : "border-transparent font-medium text-muted hover:text-ink",
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="rounded bg-ink/7 px-1.5 py-px text-[11.5px] font-medium text-muted tabular-nums">{tab.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
