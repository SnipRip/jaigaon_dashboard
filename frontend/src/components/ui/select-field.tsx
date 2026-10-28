"use client";

import clsx from "clsx";
import { Check, ChevronDown } from "lucide-react";
import { Select } from "radix-ui";
import { useId } from "react";
import { fieldClasses, fieldLabelClasses } from "./text-field";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  label: string;
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

// A labelled dropdown. Replaces the native <select> so the open list matches
// the rest of the app instead of being drawn by the operating system.
export function SelectField({ label, options, className, ...props }: SelectFieldProps) {
  const id = useId();

  return (
    <div className={clsx("flex flex-col gap-1", className)}>
      <label htmlFor={id} className={fieldLabelClasses}>
        {label}
      </label>
      <Select.Root {...props}>
        <Select.Trigger
          id={id}
          className={clsx(fieldClasses, "group flex items-center justify-between gap-2 text-left hover:bg-white data-[state=open]:border-brand")}
        >
          <span className="truncate">
            <Select.Value />
          </span>
          <Select.Icon>
            <ChevronDown aria-hidden="true" className="size-4 text-muted transition-transform group-data-[state=open]:rotate-180" />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            position="popper"
            sideOffset={6}
            className="z-30 max-h-(--radix-select-content-available-height) w-(--radix-select-trigger-width) animate-pop-in glass-popover overflow-hidden"
          >
            <Select.Viewport className="p-1">
              {options.map((option) => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  className="flex h-8 cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 text-[13px] text-ink-soft outline-none select-none data-[highlighted]:bg-brand-tint data-[highlighted]:text-brand-strong data-[state=checked]:font-semibold data-[state=checked]:text-ink"
                >
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator>
                    <Check aria-hidden="true" className="size-4 text-brand" />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}
