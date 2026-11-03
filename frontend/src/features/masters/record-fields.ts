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
  /** Shown, checked and saved only while another field has one of these values (a cash account has no bank fields). */
  showWhen?: { key: string; values: string[] };
}

export type FieldSpec = FieldBase &
  (
    | { kind: "text"; placeholder?: string; required?: boolean; pattern?: RegExp; message?: string; maxLength?: number; upperCase?: boolean }
    | { kind: "number"; placeholder?: string; required?: boolean; decimals?: number; /** Allows a minus sign (an overdraft's balance). */ signed?: boolean }
    | { kind: "select"; options: SelectOption[]; required?: boolean }
    | { kind: "toggle"; onLabel: string; offLabel: string }
    | { kind: "date"; required?: boolean }
    | { kind: "textarea"; placeholder?: string; required?: boolean; maxLength?: number }
  );

export type FormValues = Record<string, string | boolean>;
type StoredValue = string | number | boolean | undefined;

const decimalPattern = (decimals: number, signed = false) =>
  new RegExp(`^${signed ? "-?" : ""}\\d+${decimals ? `(\\.\\d{1,${decimals}})?` : ""}$`);

/** Whether a field is in play for these values (see `showWhen`). */
export const isShown = (field: FieldSpec, values: Record<string, unknown>) =>
  !field.showWhen || field.showWhen.values.includes(String(values[field.showWhen.key] ?? ""));

const isRequired = (field: FieldSpec) => "required" in field && Boolean(field.required);

export function schemaFor(fields: FieldSpec[]): z.ZodType<FormValues, FormValues> {
  const shape: Record<string, z.ZodType> = {};
  for (const spec of fields) {
    // A conditional field may be missing (the form drops it while hidden); its
    // "required" is checked below, only while it shows.
    const field = spec.showWhen && isRequired(spec) ? ({ ...spec, required: false } as FieldSpec) : spec;
    switch (field.kind) {
      case "toggle":
        shape[field.key] = z.boolean();
        break;
      case "number": {
        const number = z.string().trim().regex(decimalPattern(field.decimals ?? 2, field.signed), "Enter a number");
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
    if (spec.showWhen) shape[spec.key] = shape[spec.key].optional();
  }
  const requiredWhenShown = fields.filter((field) => field.showWhen && isRequired(field));
  const schema = z.object(shape).superRefine((values, context) => {
    for (const field of requiredWhenShown) {
      if (isShown(field, values) && !String(values[field.key] ?? "").trim()) {
        context.addIssue({ code: "custom", path: [field.key], message: `Enter the ${field.label.toLowerCase()}` });
      }
    }
  });
  // The shape is built at run time, so zod cannot infer it; every value is a string or a boolean.
  return schema as unknown as z.ZodType<FormValues, FormValues>;
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
      if (!isShown(field, values)) return [field.key, undefined];
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
