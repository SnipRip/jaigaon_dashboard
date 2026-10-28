"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Paperclip } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import type { DispatchDocumentType } from "./dispatch-documents";
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
  onSave: (document: DispatchDocument) => void;
  onCancel: () => void;
}

export function AttachDocumentForm({ type, existing, suggestions, onSave, onCancel }: AttachDocumentFormProps) {
  const schema = schemaFor(type);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Record<string, string>>({
    resolver: zodResolver(schema),
    defaultValues: {
      number: existing?.number ?? "",
      date: existing?.date ?? suggestions.date ?? "",
      ...Object.fromEntries(type.fields.map((field) => [field.key, existing?.details[field.key] ?? suggestions[field.key] ?? ""])),
    },
  });

  const submit = handleSubmit(({ number, date, ...details }) => onSave({ number, date, details, fileName: existing?.fileName }));
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
        <p className="text-xs font-semibold text-muted">Uploading switches on when document storage is set up. The OCR inbox will read the number from the scan.</p>
      </div>
      <div className="flex justify-end gap-2.5">
        <Button variant="neutral" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{existing ? "Save changes" : `Attach ${type.name.toLowerCase()}`}</Button>
      </div>
    </form>
  );
}
