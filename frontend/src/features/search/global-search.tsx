"use client";

import clsx from "clsx";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { searchEntries, type SearchEntry } from "./search-match";

// The top bar's search (SOW 17): products, parties, invoices, Shipping Bill
// and LEO numbers, vehicles. Arrow keys move, Enter opens, Escape closes,
// Ctrl+K (⌘K) jumps here from anywhere.
export function GlobalSearch({ index }: { index: SearchEntry[] }) {
  const router = useRouter();
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const results = searchEntries(index, query);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (target: SearchEntry | undefined) => {
    if (!target) return;
    router.push(target.href);
    setOpen(false);
    setQuery("");
    input.current?.blur();
  };

  return (
    <div className="relative max-w-[460px] min-w-[190px] flex-[1_20_280px] max-md:hidden">
      <div className="glass-field flex h-11 items-center gap-2.5 border-white/70 px-4">
        <Search aria-hidden="true" className="size-[18px] shrink-0 text-muted" />
        <label htmlFor="global-search" className="sr-only">
          Global search
        </label>
        <input
          ref={input}
          id="global-search"
          type="search"
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls={listId}
          aria-activedescendant={open && results[active] ? `${listId}-${active}` : undefined}
          autoComplete="off"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((value) => Math.min(value + 1, results.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((value) => Math.max(value - 1, 0));
            } else if (event.key === "Enter") {
              event.preventDefault();
              go(results[active]);
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder="Search products, invoices, Shipping Bill / LEO no., vehicles"
          className="h-10 min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-muted"
        />
        <kbd className="hidden rounded-md border border-line px-1.5 text-[11px] font-bold text-muted lg:inline">Ctrl K</kbd>
      </div>
      {open && query.trim() && (
        <div className="glass-popover absolute inset-x-0 top-[calc(100%+6px)] z-30 animate-pop-in p-1.5">
          {results.length === 0 ? (
            <p className="px-3.5 py-3 text-sm font-semibold text-muted">Nothing matches &ldquo;{query.trim()}&rdquo;.</p>
          ) : (
            <ul id={listId} role="listbox" aria-label="Search results">
              {results.map((result, index) => (
                <li
                  key={`${result.href}-${result.title}`}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === active}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    go(result);
                  }}
                  onMouseEnter={() => setActive(index)}
                  className={clsx("flex cursor-pointer items-center gap-3 rounded-2xl px-3.5 py-2.5", index === active && "bg-brand-tint")}
                >
                  <span className="w-24 shrink-0 truncate text-[11px] font-bold tracking-wide text-muted uppercase">{result.kind}</span>
                  <span className="flex min-w-0 flex-col">
                    <span className={clsx("truncate text-sm font-bold", index === active && "text-brand-strong")}>{result.title}</span>
                    <span className="truncate text-xs font-semibold text-muted">{result.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
