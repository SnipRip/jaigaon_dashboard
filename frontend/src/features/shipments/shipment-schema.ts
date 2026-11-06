import { z } from "zod";

/** Indian (WB73E1234) or Bhutanese (BG2A1234, BP-1-A1234) plates; spaces are dropped (backend: VEHICLE_PATTERN). */
export const VEHICLE_PATTERN = /^[A-Z]{2}-?\d{1,2}-?[A-Z]{0,3}-?\d{4}$/;
export const normaliseVehicle = (value: string) => value.toUpperCase().replace(/\s+/g, "");

const optionalWhole = z.union([z.literal(""), z.string().trim().regex(/^\d{1,6}$/, "Whole number")]);

export const shipmentSchema = z.object({
  invoiceIds: z.array(z.string()).min(1, "Pick at least one export invoice"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the date"),
  vehicleNumber: z
    .string()
    .trim()
    .min(1, "Enter the vehicle number")
    .refine((value) => VEHICLE_PATTERN.test(normaliseVehicle(value)), "Like WB73E1234 or BG2A1234"),
  transporterId: z.string(),
  driverName: z.string().trim().max(60),
  driverPhone: z.union([z.literal(""), z.string().trim().regex(/^\+?\d{8,13}$/, "8 to 13 digits")]),
  destination: z.string().trim().min(1, "Where in Bhutan is it going?").max(60),
  borderPoint: z.string().trim().min(1, "Enter the border point").max(80),
  customsAgent: z.string().trim().max(80),
  sealNumber: z.string().trim().max(30),
  packages: optionalWhole.refine((value) => value === "" || Number(value) > 0, "More than 0"),
  grossWeightKg: z.union([z.literal(""), z.string().trim().regex(/^\d{1,9}(\.\d{1,3})?$/, "Weight in kg").refine((value) => Number(value) > 0, "More than 0")]),
  notes: z.string().trim().max(300),
});

export type ShipmentFormValues = z.infer<typeof shipmentSchema>;
