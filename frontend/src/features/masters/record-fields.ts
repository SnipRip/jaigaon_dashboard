// Field descriptions for the simple masters (brands, units, banks …). One
// list of fields drives the form, its zod schema and the conversion between
// form strings and the stored record, so each master is a page of config.
import { z } from "zod";
import type { SelectOption } from "@/components/ui/select-field";

interface FieldBase {
  key: string;
  label: string;
  hint?: string;
  /** Takes the full row of the form. */
  wide?: boolean;
}

export type FieldSpec = FieldBase &
  (
    | { kind: "text"; placeholder?: string; required?: boolean; pattern?: RegExp; message?: string; maxLength?: number; upperCase?: boolean }
    | { kind: "number"; placeholder?: string; required?: boolean; decimals?: number }
    | { kind: "select"; options: SelectOption[]; required?: boolean }
    | { kind: "toggle"; onLabel: string; offLabel: string }
    | { kind: "date"; required?: boolean }
    | { kind: "textarea"; placeholder?: string; required?: boolean; maxLength?: number }
  );

export type FormValues = Record<string, string | boolean>;
type StoredValue = string | number | boolean | undefined;

const decimalPattern = (decimals: number) => new RegExp(decimals ? `^\\d+(\\.\\d{1,${decimals}})?$` : "^\\d+$");

export function schemaFor(fields: FieldSpec[]): z.ZodType<FormValues, FormValues> {
  const shape: Record<string, z.ZodType> = {};
  for (const field of fields) {
    switch (field.kind) {
      case "toggle":
        shape[field.key] = z.boolean();
        break;
      case "number": {
        const number = z.string().trim().regex(decimalPattern(field.decimals ?? 2), "Enter a number");
        shape[field.key] = field.required ? number : z.union([z.literal(""), number]);
        break;
      }
      case "date": {
        const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `Pick the ${field.label.toLowerCase()}`);
        shape[field.key] = field.required ? date : z.union([z.literal(""), date]);
        break;
      }
      case "select":
        shape[field.key] = field.required ? z.string().min(1, `Pick the ${field.label.toLowerCase()}`) : z.string();
        break;
      default: {
        let text = z.string().trim().max(field.maxLength ?? (field.kind === "textarea" ? 1000 : 120), "Too long");
        if (field.kind === "text" && field.pattern) text = text.regex(field.pattern, field.message ?? "Check the format");
        const required = "required" in field && field.required;
        shape[field.key] = required ? text.min(1, `Enter the ${field.label.toLowerCase()}`) : z.union([z.literal(""), text]);
      }
    }
  }
  // The shape is built at run time, so zod cannot infer it; every value is a string or a boolean.
  return z.object(shape) as unknown as z.ZodType<FormValues, FormValues>;
}

export function toFormValues(fields: FieldSpec[], record?: Record<string, unknown>): FormValues {
  return Object.fromEntries(
    fields.map((field) => {
      const value = record?.[field.key];
      if (field.kind === "toggle") return [field.key, Boolean(value)];
      return [field.key, value === undefined || value === null ? "" : String(value)];
    }),
  );
}

export function fromFormValues(fields: FieldSpec[], values: FormValues): Record<string, StoredValue> {
  return Object.fromEntries(
    fields.map((field): [string, StoredValue] => {
      const value = values[field.key];
      if (field.kind === "toggle") return [field.key, Boolean(value)];
      const text = String(value ?? "").trim();
      if (!text) return [field.key, undefined];
      if (field.kind === "number") return [field.key, Number(text)];
      return [field.key, field.kind === "text" && field.upperCase ? text.toUpperCase() : text];
    }),
  );
}

/** "Hind TMT" → "hind-tmt", unique against the ids already used. */
export function newId(label: string, taken: string[]) {
  const base = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "record";
  let id = base;
  for (let n = 2; taken.includes(id); n++) id = `${base}-${n}`;
  return id;
}
