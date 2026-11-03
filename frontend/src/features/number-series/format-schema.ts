// The number format form. Field shapes only: whether a pattern suits its kind
// (GST length and characters, the first character, {MM} for a monthly
// restart) is the backend's call, and its message is shown on the form.
import { z } from "zod";

export const formatSchema = z.object({
  applicableFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the date the format starts"),
  pattern: z
    .string()
    .trim()
    .min(1, "Enter the pattern")
    .max(60, "Up to 60 characters")
    .refine((pattern) => /\{SEQ(:\d)?\}/i.test(pattern), "Put {SEQ} (the running number) in the pattern"),
  startNumber: z.string().trim().regex(/^[1-9]\d{0,7}$/, "A whole number from 1"),
  reset: z.enum(["YEARLY", "MONTHLY", "NEVER"]),
});

export type FormatValues = z.infer<typeof formatSchema>;
