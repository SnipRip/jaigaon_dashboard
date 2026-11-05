"use client";

import clsx from "clsx";
import { Check, Plus, Search, X } from "lucide-react";
import { Popover } from "radix-ui";
import { useId, useState } from "react";
import type { SelectOption } from "./select-field";
import { fieldLabelClasses } from "./text-field";

interface MultiPickFieldProps {
  label: string;
  options: (SelectOption & { group?: string })[];
  values: string[];
  onChange: (values: string[]) => void;
  /** Shown when nothing is picked, e.g. "Every item". */
  emptyText: string;
  addLabel: string;
  hint?: string;
  error?: string;
}

/** The options a search shows at once; typing narrows a long list. */
const SHOWN = 60;

// Picks several records from a long list: the picked ones show as chips
// with a remove button; "Add" opens a searchable list where a click picks
// or unpicks. Matches the other fields instead of a browser multi-select.
export function MultiPickField({ label, options, values, onChange, emptyText, addLabel, hint, error }: MultiPickFieldProps) {
  const id = useId();
  const [query, setQuery] = useState("");
  const labelOf = new Map(options.map((option) => [option.value, option.label]));
  const needle = query.trim().toLowerCase();
  const matches = options.filter((option) => !needle || `${option.group ?? ""} ${option.label}`.toLowerCase().includes(needle));
  const toggle = (value: string) => onChange(values.includes(value) ? values.filter((picked) => picked !== value) : [...values, value]);

  return (
    <div className="flex flex-col gap-1.5">
      <span id={`${id}-label`} className={fieldLabelClasses}>
        {label}
      </span>
      <div role="group" aria-labelledby={`${id}-label`} className="flex flex-wrap items-center gap-1.5">
        {values.length === 0 && <span className="text-[13px] font-semibold text-muted">{emptyText}</span>}
        {values.map((value) => (
          <span key={value} className="glass-inset inline-flex h-7 max-w-full items-center gap-1 pr-0.5 pl-2.5 text-[12.5px] font-semibold">
            <span className="truncate">{labelOf.get(value) ?? "Removed"}</span>
            <button
              type="button"
              aria-label={`Remove ${labelOf.get(value) ?? "this"}`}
              onClick={() => toggle(value)}
              className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted hover:bg-ink/5 hover:text-ink"
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          </span>
        ))}
        <Popover.Root onOpenChange={(open) => !open && setQuery("")}>
          <Popover.Trigger className="glass-control glass-press inline-flex h-7 items-center gap-1 px-2.5 text-[12.5px] font-semibold text-brand hover:bg-brand-tint/60">
            <Plus aria-hidden="true" className="size-3.5" />
            {addLabel}
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content align="start" sideOffset={6} className="z-40 w-[min(360px,calc(100vw-32px))] animate-pop-in glass-popover p-1.5">
              <label className="glass-inset mb-1.5 flex h-8 items-center gap-1.5 px-2.5">
                <Search aria-hidden="true" className="size-4 text-muted" />
                <span className="sr-only">Search</span>
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search"
                  className="min-w-0 flex-1 bg-transparent text-[13px] outline-none"
                />
              </label>
              <ul role="listbox" aria-multiselectable="true" aria-label={label} className="max-h-72 overflow-y-auto">
                {matches.slice(0, SHOWN).map((option) => {
                  const picked = values.includes(option.value);
                  return (
                    <li key={option.value} role="option" aria-selected={picked}>
                      <button
                        type="button"
                        onClick={() => toggle(option.value)}
                        className={clsx(
                          "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] hover:bg-brand-tint hover:text-brand-strong",
                          picked ? "font-semibold text-ink" : "text-ink-soft",
                        )}
                      >
                        <span className="min-w-0">
                          {option.group && <span className="block text-[11px] font-semibold text-muted">{option.group}</span>}
                          <span className="block truncate">{option.label}</span>
                        </span>
                        {picked && <Check aria-hidden="true" className="size-4 shrink-0 text-brand" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {matches.length === 0 && <p className="px-2.5 py-3 text-[13px] text-muted">Nothing matches.</p>}
              {matches.length > SHOWN && <p className="px-2.5 pt-1 text-[11.5px] text-muted">{matches.length - SHOWN} more: type to narrow.</p>}
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>
      {hint && !error && <p className="text-[11.5px] text-muted">{hint}</p>}
      {error && <p className="text-xs font-semibold text-danger-strong">{error}</p>}
    </div>
  );
}
