"use client";

import { Paperclip, X } from "lucide-react";
import { useId, useRef } from "react";

interface FilePickerProps {
  label: string;
  /** e.g. ".xlsx,.csv" or "application/pdf,image/*" */
  accept: string;
  file: File | null;
  onChange: (file: File | null) => void;
  hint?: string;
}

// The browser's file input, hidden behind a capsule button that matches the
// other controls (design.md, "No browser-default controls"). The picked
// file's name shows beside it with a clear button.
export function FilePicker({ label, accept, file, onChange, hint }: FilePickerProps) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted">{label}</span>
      <div className="flex flex-wrap items-center gap-2.5">
        <label
          htmlFor={id}
          className="glass-control glass-press inline-flex h-8 cursor-pointer items-center gap-1.5 px-3 text-[13px] font-semibold text-brand focus-within:outline-2 focus-within:outline-brand hover:bg-brand-tint/60"
        >
          <Paperclip aria-hidden="true" className="size-[15px]" />
          {file ? "Choose another file" : "Choose a file"}
          <input
            ref={input}
            id={id}
            type="file"
            accept={accept}
            className="sr-only"
            onChange={(event) => onChange(event.target.files?.[0] ?? null)}
          />
        </label>
        {file && (
          <span className="glass-inset inline-flex h-8 max-w-full items-center gap-1.5 pr-1 pl-3 text-[13px]">
            <span className="truncate">{file.name}</span>
            <button
              type="button"
              aria-label={`Remove ${file.name}`}
              onClick={() => {
                onChange(null);
                if (input.current) input.current.value = "";
              }}
              className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted hover:bg-ink/5 hover:text-ink"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </span>
        )}
      </div>
      {hint && <p className="text-[11.5px] text-muted">{hint}</p>}
    </div>
  );
}
