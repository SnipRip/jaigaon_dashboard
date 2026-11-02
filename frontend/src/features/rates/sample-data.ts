// SAMPLE DATA for pricing: invented price levels, special rates and slabs
// for the sample customers and items.
import type { PriceLevel, QuantitySlab, SpecialRate } from "./types";

export const priceLevels: PriceLevel[] = [
  { id: "retail", name: "Retail", discountPct: 0, description: "Walk-in and small buyers: selling price", categoryDiscounts: [] },
  { id: "contractor", name: "Contractor", discountPct: 4, description: "Site contractors with regular orders", categoryDiscounts: [] },
  { id: "dealer", name: "Dealer", discountPct: 7, description: "Shops that resell", categoryDiscounts: [] },
  { id: "bhutan-export", name: "Bhutan export", discountPct: 6, description: "Bhutan builders buying by the truck", categoryDiscounts: [] },
];

export const specialRates: SpecialRate[] = [
  { id: "sr-1", customerId: "tashi-construction", itemId: "tmt-12", kind: "net", value: 57.5, validFrom: "2026-10-01", validTill: "2026-11-30", notes: "Agreed for the Thimphu hospital job" },
  { id: "sr-2", customerId: "tashi-construction", itemId: "tmt-16", kind: "net", value: 57.5, validFrom: "2026-10-01", validTill: "2026-11-30" },
  { id: "sr-3", customerId: "druk-builders", itemId: "aac-200", kind: "discount", value: 10, validFrom: "2026-10-01", validTill: "2026-12-31" },
  { id: "sr-4", customerId: "siliguri-infra", itemId: "angle-50", kind: "net", value: 64, validFrom: "2026-07-01", validTill: "2026-10-15", notes: "Expired: renew or let lapse" },
  { id: "sr-5", customerId: "guwahati-hardware", itemId: "binding-wire", kind: "discount", value: 5, validFrom: "2026-10-01", validTill: "2027-03-31" },
];

export const quantitySlabs: QuantitySlab[] = [
  { id: "slab-1", itemId: "tmt-12", minQuantity: 5000, discountPct: 1 },
  { id: "slab-2", itemId: "tmt-12", minQuantity: 10000, discountPct: 2 },
  { id: "slab-3", itemId: "aac-200", minQuantity: 2000, discountPct: 2 },
  { id: "slab-4", itemId: "brick-1", minQuantity: 10000, discountPct: 3 },
];
