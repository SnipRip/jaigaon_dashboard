"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { saveErrorText } from "@/lib/api-client";
import type { NumberFormatView, NumberSeriesView } from "@/types/number-series";
import { formatSchema, type FormatValues } from "./format-schema";
import { isMasterCode, KINDS, RESETS } from "./number-kinds";
import { renderPattern, TOKEN_HELP } from "./number-pattern";
import { saveFormat } from "./number-series-api";

interface FormatFormProps {
  series: NumberSeriesView;
  /** Left out: a new format. */
  format?: NumberFormatView;
  /** The viewer's today, the default start. */
  today: string;
  onCancel: () => void;
  onSaved: (values: FormatValues) => Promise<void>;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// A pattern in force from a date. The preview shows the first number it
// gives; the backend checks the GST rules on save.
export function FormatForm({ series, format, today, onCancel, onSaved }: FormatFormProps) {
  const kind = KINDS[series.kind];
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormatValues>({
    resolver: zodResolver(formatSchema),
    defaultValues: format
      ? { applicableFrom: format.applicableFrom, pattern: format.pattern, startNumber: String(format.startNumber), reset: format.reset }
      : { applicableFrom: today, pattern: series.formats[0]?.pattern ?? kind.suggested.pattern, startNumber: "1", reset: series.formats[0]?.reset ?? kind.suggested.reset },
  });
  const [applicableFrom, pattern, startNumber] = useWatch({ control, name: ["applicableFrom", "pattern", "startNumber"] });
  const previewDate = ISO_DATE.test(applicableFrom) ? applicableFrom : today;
  const preview = renderPattern(pattern ?? "", previewDate, Number(startNumber) || 1);
  const resets = isMasterCode(series.kind) ? RESETS.filter((reset) => reset.value === "NEVER") : RESETS;

  const submit = handleSubmit(async (values) => {
    setError(null);
    try {
      await saveFormat(series, values, format?.id);
      await onSaved(values);
    } catch (failure) {
      setError(saveErrorText(failure));
    }
  });

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3.5">
      <TextField
        label="Pattern"
        autoCapitalize="characters"
        spellCheck={false}
        placeholder={kind.suggested.pattern}
        error={errors.pattern?.message}
        {...register("pattern")}
      />
      <div className="flex flex-wrap gap-1.5 text-xs text-muted">
        {TOKEN_HELP.map(({ token, example }) => (
          <span key={token} className="glass-control rounded-(--radius-control) px-1.5 py-0.5 font-medium">
            <code className="font-semibold text-ink">{token}</code> {example}
          </span>
        ))}
      </div>
      <div className="flex items-baseline justify-between gap-3 rounded-(--radius-control) bg-brand-tint/50 px-3 py-2">
        <span className="text-xs font-semibold text-muted">First number</span>
        <span className="font-semibold tabular-nums">{preview || "–"}</span>
        <span className={kind.gst && preview.length > 16 ? "text-xs font-semibold text-danger-strong" : "text-xs text-muted"}>
          {preview.length}
          {kind.gst ? " of 16" : " characters"}
        </span>
      </div>
      <div className="grid gap-3.5 sm:grid-cols-2">
        <TextField label="Applies from" type="date" error={errors.applicableFrom?.message} {...register("applicableFrom")} />
        <TextField
          label="Starting number"
          inputMode="numeric"
          hint="Continue from Tally: its next number"
          error={errors.startNumber?.message}
          {...register("startNumber")}
        />
      </div>
      <Controller
        control={control}
        name="reset"
        render={({ field }) => (
          <SelectField label="Restart the running number" options={resets} value={field.value} onValueChange={field.onChange} />
        )}
      />
      {kind.gst && (
        <p className="text-xs font-medium text-muted">
          GST: at most 16 characters, only letters, digits, - and /, starting with a letter or 1–9, never repeated in a financial year.
        </p>
      )}
      {error && <FormMessage tone="error">{error}</FormMessage>}
      <div className="flex justify-end gap-2.5">
        <Button variant="neutral" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {format ? "Save format" : "Add format"}
        </Button>
      </div>
    </form>
  );
}
