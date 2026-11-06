"use client";

import clsx from "clsx";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import useSWR from "swr";
import { useDebounceValue } from "usehooks-ts";
import { apiGet } from "@/lib/api-client";
import type { SearchResultView } from "@/types/search";

/** Wait this long after the last key before asking the server. */
const TYPING_PAUSE_MS = 250;
/** Results shown; the server sends at most five of each kind. */
const SHOWN = 10;
/** Fewer characters match nearly everything (the server refuses them too). */
const MIN_LENGTH = 2;

const searchPath = (query: string) => `/search?q=${encodeURIComponent(query)}`;

// The top bar's search (SOW 17) on the server (GET /search): items, parties,
// quotations, invoices and their document numbers (IRN, e-way bill, Shipping
// Bill, LEO …), bills, shipments, transfers, receipts and payments, expenses,
// vehicles; only what the user's role may open. Arrow keys move, Enter
// opens, Escape closes, Ctrl+K (⌘K) jumps here from anywhere.
export function GlobalSearch() {
  const router = useRouter();
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [asked] = useDebounceValue(query.trim(), TYPING_PAUSE_MS);
  const { data, error, isLoading } = useSWR<SearchResultView[]>(asked.length >= MIN_LENGTH ? searchPath(asked) : null, apiGet, { keepPreviousData: true });
  const waiting = asked !== query.trim() || isLoading;
  const results = (asked.length >= MIN_LENGTH ? (data ?? []) : []).slice(0, SHOWN);

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

  const go = (target: SearchResultView | undefined) => {
    if (!target) return;
    router.push(target.href);
    setOpen(false);
    setQuery("");
    input.current?.blur();
  };

  return (
    <div className="relative max-w-[380px] min-w-[190px] flex-[1_20_280px] max-md:hidden">
      <div className="glass-field flex h-8 items-center gap-2 px-2.5">
        <Search aria-hidden="true" className="size-4 shrink-0 text-muted" />
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
          className="h-full min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted"
        />
        <kbd className="hidden rounded bg-ink/7 px-1.5 py-px text-[11px] font-medium text-muted lg:inline">Ctrl K</kbd>
      </div>
      {open && query.trim() && (
        <div className="glass-popover absolute left-0 top-[calc(100%+6px)] w-[max(100%,22rem)] z-30 animate-pop-in p-1">
          {error ? (
            <p className="px-2.5 py-2 text-[13px] text-muted">Search is not available right now.</p>
          ) : results.length === 0 ? (
            <p className="px-2.5 py-2 text-[13px] text-muted">{query.trim().length < MIN_LENGTH ? "Type at least 2 characters." : waiting ? "Searching…" : <>Nothing matches &ldquo;{query.trim()}&rdquo;.</>}</p>
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
                  className={clsx("flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-1.5", index === active && "bg-brand-tint")}
                >
                  <span className="w-24 shrink-0 truncate text-xs text-muted">{result.kind}</span>
                  <span className="flex min-w-0 flex-col">
                    <span className={clsx("truncate text-[13px] font-semibold", index === active && "text-brand-strong")}>{result.title}</span>
                    <span className="truncate text-xs text-muted">{result.detail}</span>
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
