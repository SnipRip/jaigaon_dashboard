"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { FilterGroup } from "@/components/ui/filter-group";
import { SelectField } from "@/components/ui/select-field";
import { TextArea } from "@/components/ui/text-area";
import { TextField } from "@/components/ui/text-field";
import { schemaFor, toFormValues, type FieldSpec, type FormValues } from "./record-fields";

interface RecordFormProps {
  fields: FieldSpec[];
  initial?: Record<string, unknown>;
  submitLabel: string;
  onSubmit: (values: FormValues) => void;
  onCancel: () => void;
}

// The form inside a master's dialog, laid out from its field list.
export function RecordForm({ fields, initial, submitLabel, onSubmit, onCancel }: RecordFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schemaFor(fields)), defaultValues: toFormValues(fields, initial) });
  const errorOf = (key: string) => errors[key]?.message as string | undefined;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-3.5">
      <div className="grid gap-3.5 sm:grid-cols-2">
        {fields.map((field) => {
          const span = field.wide || field.kind === "textarea" ? "sm:col-span-2" : undefined;
          switch (field.kind) {
            case "select":
              return (
                <div key={field.key} className={span}>
                  <Controller
                    control={control}
                    name={field.key}
                    render={({ field: control }) => (
                      <SelectField label={field.label} options={field.options} value={(control.value as string) || undefined} onValueChange={control.onChange} />
                    )}
                  />
                  {(errorOf(field.key) ?? field.hint) && (
                    <p className={errorOf(field.key) ? "mt-1.5 text-xs font-semibold text-danger-strong" : "mt-1.5 text-xs font-semibold text-muted"}>
                      {errorOf(field.key) ?? field.hint}
                    </p>
                  )}
                </div>
              );
            case "toggle":
              return (
                <Controller
                  key={field.key}
                  control={control}
                  name={field.key}
                  render={({ field: control }) => (
                    <div className={span ?? "flex flex-col gap-1.5"}>
                      <span className="text-xs font-medium text-muted">{field.label}</span>
                      <FilterGroup label={field.label}>
                        <FilterChip selected={control.value === true} onClick={() => control.onChange(true)}>
                          {field.onLabel}
                        </FilterChip>
                        <FilterChip selected={control.value === false} onClick={() => control.onChange(false)}>
                          {field.offLabel}
                        </FilterChip>
                      </FilterGroup>
                      {field.hint && <p className="text-xs font-semibold text-muted">{field.hint}</p>}
                    </div>
                  )}
                />
              );
            case "textarea":
              return (
                <div key={field.key} className={span}>
                  <TextArea label={field.label} placeholder={field.placeholder} hint={field.hint} error={errorOf(field.key)} {...register(field.key)} />
                </div>
              );
            default:
              return (
                <div key={field.key} className={span}>
                  <TextField
                    label={field.label}
                    type={field.kind === "date" ? "date" : undefined}
                    placeholder={"placeholder" in field ? field.placeholder : undefined}
                    hint={field.hint}
                    inputMode={field.kind === "number" ? "decimal" : undefined}
                    error={errorOf(field.key)}
                    {...register(field.key)}
                  />
                </div>
              );
          }
        })}
      </div>
      <div className="flex flex-wrap justify-end gap-2.5">
        <Button variant="neutral" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
