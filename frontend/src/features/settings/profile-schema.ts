import { z } from "zod";

// Mirrors backend/src/users/dto/update-profile.dto.ts.
export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(80),
  displayName: z.string().trim().min(2, "Enter the name to show on quotations").max(80),
  phone: z
    .string()
    .trim()
    .regex(/^$|^\+[1-9]\d{7,14}$/, "Use the country code and digits only, for example +919635312988"),
});

export type ProfileValues = z.infer<typeof profileSchema>;
