import clsx from "clsx";
import { useId, type InputHTMLAttributes, type ReactNode } from "react";

/** Shared look of every input and select. */
export const fieldClasses =
  "glass-field h-[34px] w-full px-2.5 text-[13px] text-ink placeholder:text-muted disabled:border-line disabled:bg-ink/5 disabled:text-ink-soft";

export const fieldLabelClasses = "text-xs font-medium text-muted";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  /** Rendered inside the field's right edge, e.g. a show-password button. */
  trailing?: ReactNode;
  /** Label read by screen readers only, for a field inside a table row. */
  hideLabel?: boolean;
}

// A labelled input with its hint and error wired up for screen readers.
// Works with react-hook-form: spread `register("name")` onto it.
export function TextField({ label, error, hint, trailing, hideLabel, className, id, ...props }: TextFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const messageId = `${fieldId}-message`;
  const message = error ?? hint;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={fieldId} className={hideLabel ? "sr-only" : fieldLabelClasses}>
        {label}
      </label>
      <div className="relative">
        <input
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          className={clsx(fieldClasses, error && "border-danger", trailing && "pr-14", className)}
          {...props}
        />
        {trailing && <div className="absolute inset-y-0 right-0 flex items-center">{trailing}</div>}
      </div>
      {message && (
        <p id={messageId} className={clsx("text-[11.5px] font-medium", error ? "text-danger-strong" : "text-muted")}>
          {message}
        </p>
      )}
    </div>
  );
}
