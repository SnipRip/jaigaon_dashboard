"use client";

import { X } from "lucide-react";
import { useId, useState } from "react";
import { fieldLabelClasses } from "@/components/ui/text-field";

interface OptionsInputProps {
  label: string;
  options: string[];
  onChange: (options: string[]) => void;
  placeholder?: string;
  error?: string;
}

// A field that turns what is typed into option chips: Enter or a comma adds
// one, Backspace on an empty field removes the last.
export function OptionsInput({ label, options, onChange, placeholder, error }: OptionsInputProps) {
  const id = useId();
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const values = raw
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value && !options.includes(value));
    if (values.length > 0) onChange([...options, ...new Set(values)]);
    setDraft("");
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={fieldLabelClasses}>
        {label}
      </label>
      <div className="glass-field flex min-h-11 flex-wrap items-center gap-1.5 rounded-[22px] px-2 py-1.5">
        {options.map((option) => (
          <span key={option} className="flex h-8 items-center gap-1 rounded-full bg-brand-tint pr-1 pl-3 text-[13px] font-bold text-brand-strong">
            {option}
            <button
              type="button"
              aria-label={`Remove ${option}`}
              onClick={() => onChange(options.filter((candidate) => candidate !== option))}
              className="flex size-6 items-center justify-center rounded-full hover:bg-white/70"
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(event) => (event.target.value.includes(",") ? add(event.target.value) : setDraft(event.target.value))}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add(draft);
            } else if (event.key === "Backspace" && !draft && options.length > 0) {
              onChange(options.slice(0, -1));
            }
          }}
          onBlur={() => draft && add(draft)}
          placeholder={options.length === 0 ? placeholder : "Add another"}
          aria-invalid={error ? true : undefined}
          className="h-8 min-w-[120px] flex-1 bg-transparent px-2 text-sm font-bold outline-none placeholder:font-medium placeholder:text-muted"
        />
      </div>
      {error && <p className="text-xs font-semibold text-danger-strong">{error}</p>}
    </div>
  );
}
