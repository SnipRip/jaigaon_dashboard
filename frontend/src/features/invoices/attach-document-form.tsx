"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Paperclip } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { TextField } from "@/components/ui/text-field";
import type { DispatchDocumentType } from "./dispatch-documents";
import { ApiError } from "@/lib/api-client";
import type { DispatchDocument } from "./types";

/** Built from the document type, so each kind checks its own number format. */
function schemaFor(type: DispatchDocumentType) {
  const number = type.numberPattern
    ? z.string().trim().regex(type.numberPattern, type.numberMessage ?? "Check the number")
    : z.string().trim().min(1, `Enter the ${type.numberLabel.toLowerCase()}`);
  const details = Object.fromEntries(
    type.fields.map((field) => [
      field.key,
      field.pattern ? z.union([z.literal(""), z.string().trim().regex(field.pattern, field.message ?? "Check this value")]) : z.string().max(120),
    ]),
  );
  // Every field is a string; the record type lets one form serve every kind.
  return z.object({ number, date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the date"), ...details }) as unknown as z.ZodType<
    Record<string, string>,
    Record<string, string>
  >;
}

interface AttachDocumentFormProps {
  type: DispatchDocumentType;
  existing?: DispatchDocument;
  /** Prefills, e.g. the invoice's vehicle number on the lorry challan. */
  suggestions: Record<string, string>;
  /** Saves on the server; a refusal is shown on the form. */
  onSave: (document: DispatchDocument) => Promise<void>;
  /** Takes an attached document off the invoice (a wrong one). */
  onRemove?: () => Promise<void>;
  onCancel: () => void;
}

const failure = (error: unknown) => (error instanceof ApiError ? error.message : "Could not save. Check the connection and try again.");

export function AttachDocumentForm({ type, existing, suggestions, onSave, onRemove, onCancel }: AttachDocumentFormProps) {
  const schema = schemaFor(type);
  const [problem, setProblem] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Record<string, string>>({
    resolver: zodResolver(schema),
    defaultValues: {
      number: existing?.number ?? "",
      date: existing?.date ?? suggestions.date ?? "",
      ...Object.fromEntries(type.fields.map((field) => [field.key, existing?.details[field.key] ?? suggestions[field.key] ?? ""])),
    },
  });

  const submit = handleSubmit(async ({ number, date, ...details }) => {
    setProblem(null);
    try {
      await onSave({ number, date, details });
    } catch (error) {
      setProblem(failure(error));
    }
  });
  const remove = async () => {
    if (!onRemove) return;
    setProblem(null);
    setRemoving(true);
    try {
      await onRemove();
    } catch (error) {
      setProblem(failure(error));
      setRemoving(false);
    }
  };
  const busy = isSubmitting || removing;
  const message = (key: string) => errors[key]?.message as string | undefined;

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3.5">
      <div className="grid gap-3.5 sm:grid-cols-2">
        <TextField label={type.numberLabel} error={message("number")} {...register("number")} />
        <TextField label="Date" type="date" error={message("date")} {...register("date")} />
        {type.fields.map((field) => (
          <TextField
            key={field.key}
            label={field.label}
            placeholder={field.placeholder}
            inputMode={field.inputMode}
            error={message(field.key)}
            {...register(field.key)}
          />
        ))}
      </div>
      <div className="flex flex-col gap-1">
        <Button variant="neutral" disabled className="self-start">
          <Paperclip aria-hidden="true" className="size-[18px]" />
          Attach scan or PDF
        </Button>
        <p className="text-xs font-semibold text-muted">Uploading switches on when document storage is set up.</p>
      </div>
      {problem && <FormMessage tone="error">{problem}</FormMessage>}
      <div className="flex flex-wrap justify-end gap-2.5">
        {existing && onRemove && (
          <Button variant="danger" className="mr-auto" disabled={busy} onClick={() => void remove()}>
            {removing ? "Removing…" : "Remove"}
          </Button>
        )}
        <Button variant="neutral" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {isSubmitting ? "Saving…" : existing ? "Save changes" : `Attach ${type.name.toLowerCase()}`}
        </Button>
      </div>
    </form>
  );
}
