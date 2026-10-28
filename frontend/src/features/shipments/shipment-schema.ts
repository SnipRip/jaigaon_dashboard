import { z } from "zod";
import { vehicleNumberSchema } from "@/features/invoices/invoice-schema";

const optionalWhole = z.union([z.literal(""), z.string().trim().regex(/^\d+$/, "Whole number")]);

export const shipmentSchema = z.object({
  invoiceIds: z.array(z.string()).min(1, "Pick at least one export invoice"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the date"),
  vehicleNumber: vehicleNumberSchema.refine((value) => value !== "", "Enter the vehicle number"),
  transporterId: z.string(),
  driverName: z.string().trim().max(60),
  driverPhone: z.union([z.literal(""), z.string().trim().regex(/^\+?\d{10,13}$/, "10 to 13 digits")]),
  destination: z.string().trim().min(1, "Where in Bhutan is it going?").max(60),
  borderPoint: z.string().trim().min(1, "Enter the border point"),
  customsAgent: z.string().trim().max(80),
  sealNumber: z.string().trim().max(30),
  packages: optionalWhole,
  grossWeightKg: optionalWhole,
  notes: z.string().max(300),
});

export type ShipmentFormValues = z.infer<typeof shipmentSchema>;
