import { z } from "zod";

// Mirrors backend/src/auth/password-policy.ts. The backend is the authority;
// this copy only gives feedback before the request is sent.
const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

export const PASSWORD_RULE = `At least ${PASSWORD_MIN_LENGTH} characters, with a letter, a number and a symbol.`;

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(PASSWORD_MIN_LENGTH, PASSWORD_RULE).max(128).regex(PASSWORD_PATTERN, PASSWORD_RULE),
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "The two new passwords do not match",
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    path: ["newPassword"],
    message: "Choose a password different from the current one",
  });

export type PasswordValues = z.infer<typeof passwordSchema>;
