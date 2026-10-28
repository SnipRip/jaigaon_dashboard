import clsx from "clsx";
import { useId, type TextareaHTMLAttributes } from "react";
import { fieldClasses, fieldLabelClasses } from "./text-field";

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
}

// A labelled multi-line field (terms, message templates, notes). Same well as
// TextField, taller and with rounded rather than capsule corners.
export function TextArea({ label, error, hint, className, id, rows = 4, ...props }: TextAreaProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const messageId = `${fieldId}-message`;
  const message = error ?? hint;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={fieldId} className={fieldLabelClasses}>
        {label}
      </label>
      <textarea
        id={fieldId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={clsx(fieldClasses, "h-auto resize-y py-2 leading-relaxed", error && "border-danger", className)}
        {...props}
      />
      {message && (
        <p id={messageId} className={clsx("text-[11.5px] font-medium", error ? "text-danger-strong" : "text-muted")}>
          {message}
        </p>
      )}
    </div>
  );
}
