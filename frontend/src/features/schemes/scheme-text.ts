// How a scheme reads on screen: its benefit, conditions and who gets it, in
// a line each. No React.
import { formatDate, formatQuantity, formatRate } from "@/lib/format";
import type { SchemeBenefit, SchemeLevel, SchemePartyScope, SchemeRateSource, SchemeView } from "@/types/scheme";

export const LEVEL_OPTIONS: { value: SchemeLevel; label: string }[] = [
  { value: "LINE", label: "Each item line" },
  { value: "ORDER", label: "The whole order" },
];

export const BENEFIT_OPTIONS: { value: SchemeBenefit; label: string; levels: SchemeLevel[] }[] = [
  { value: "PERCENT", label: "% off", levels: ["LINE", "ORDER"] },
  { value: "AMOUNT_PER_UNIT", label: "₹ off per unit", levels: ["LINE"] },
  { value: "FLAT_AMOUNT", label: "Flat ₹ off", levels: ["LINE", "ORDER"] },
  { value: "FREE_QUANTITY", label: "Buy X, get Y free", levels: ["LINE"] },
];

export const PARTY_SCOPE_OPTIONS: { value: SchemePartyScope; label: string }[] = [
  { value: "ALL", label: "Every customer" },
  { value: "INDIA", label: "Customers in India (and walk-ins)" },
  { value: "OVERSEAS", label: "Bhutan and other overseas buyers" },
  { value: "SELECTED", label: "Selected customers" },
];

export const RATE_SOURCE_OPTIONS: { value: SchemeRateSource; label: string; hint: string }[] = [
  { value: "SHEET", label: "Today's rate", hint: "From the price list" },
  { value: "SPECIAL", label: "Special rate", hint: "Already negotiated" },
  { value: "MANUAL", label: "Typed rate", hint: "Typed on the line" },
];

/** "5% off, up to ₹2,000", "₹10 off per unit", "Buy 40, get 1 free". */
export function benefitText(scheme: Pick<SchemeView, "benefit" | "value" | "buyQuantity" | "maxDiscount">): string {
  const cap = scheme.maxDiscount !== null ? `, up to ${formatRate(scheme.maxDiscount)}` : "";
  switch (scheme.benefit) {
    case "PERCENT":
      return `${scheme.value}% off${cap}`;
    case "AMOUNT_PER_UNIT":
      return `${formatRate(scheme.value)} off per unit${cap}`;
    case "FLAT_AMOUNT":
      return `${formatRate(scheme.value)} off`;
    case "FREE_QUANTITY":
      return `Buy ${formatQuantity(scheme.buyQuantity ?? 0)}, get ${formatQuantity(scheme.value)} free`;
  }
}

/** "Lines of 50 or more, worth ₹10,000+", or "Orders of ₹1,00,000+". */
export function conditionText(scheme: Pick<SchemeView, "level" | "minQuantity" | "minValue">): string {
  const parts = [
    scheme.minQuantity !== null ? `${formatQuantity(scheme.minQuantity)} or more` : undefined,
    scheme.minValue !== null ? `worth ${formatRate(scheme.minValue)} or more` : undefined,
  ].filter(Boolean);
  const on = scheme.level === "LINE" ? "Each line" : "The order";
  return parts.length ? `${on}, ${parts.join(", ")}` : `${on}, any size`;
}

export const validityText = (scheme: Pick<SchemeView, "validFrom" | "validTill">) =>
  `${formatDate(scheme.validFrom)} – ${scheme.validTill ? formatDate(scheme.validTill) : "until withdrawn"}`;

export type SchemeStatus = "In force" | "Not started" | "Ended" | "Archived";

export function schemeStatus(scheme: Pick<SchemeView, "validFrom" | "validTill" | "isArchived">, today: string | null): SchemeStatus {
  if (scheme.isArchived) return "Archived";
  if (today && scheme.validFrom > today) return "Not started";
  if (today && scheme.validTill && scheme.validTill < today) return "Ended";
  return "In force";
}
