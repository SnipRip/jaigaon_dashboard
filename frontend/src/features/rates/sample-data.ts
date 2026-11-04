// SAMPLE DATA for pricing: invented special rates for the sample customers
// and items.
import type { SpecialRate } from "./types";

export const specialRates: SpecialRate[] = [
  { id: "sr-1", customerId: "tashi-construction", itemId: "tmt-12", kind: "net", value: 57.5, validFrom: "2026-10-01", validTill: "2026-11-30", notes: "Agreed for the Thimphu hospital job" },
  { id: "sr-2", customerId: "tashi-construction", itemId: "tmt-16", kind: "net", value: 57.5, validFrom: "2026-10-01", validTill: "2026-11-30" },
  { id: "sr-3", customerId: "druk-builders", itemId: "aac-200", kind: "discount", value: 10, validFrom: "2026-10-01", validTill: "2026-12-31" },
  { id: "sr-4", customerId: "siliguri-infra", itemId: "angle-50", kind: "net", value: 64, validFrom: "2026-07-01", validTill: "2026-10-15", notes: "Expired: renew or let lapse" },
  { id: "sr-5", customerId: "guwahati-hardware", itemId: "binding-wire", kind: "discount", value: 5, validFrom: "2026-10-01", validTill: "2027-03-31" },
];
