import { purchaseTax, saleTax, treatmentLabel, type PartyTaxProfile } from "@/features/gst/gst-rules";
import { stateName } from "@/features/gst/indian-states";
import type { Party, PartyRole } from "./types";

export const taxProfileOf = (party: Pick<Party, "treatment" | "placeOfSupply" | "exportRoute" | "isGta">): PartyTaxProfile => ({
  treatment: party.treatment,
  stateCode: party.placeOfSupply,
  exportRoute: party.exportRoute,
  isGta: party.isGta,
});

/** The tax decision that matters for this list: sales for customers, bills for vendors. */
export const taxFor = (role: PartyRole, companyState: string, party: Party) =>
  role === "customer" ? saleTax(companyState, taxProfileOf(party)) : purchaseTax(companyState, taxProfileOf(party));

/** "Siliguri, West Bengal" or "Thimphu, Bhutan". */
export const placeOf = (party: Party) =>
  [party.billing.city, party.billing.country ?? stateName(party.billing.stateCode)].filter(Boolean).join(", ");

/**
 * What is due in this list: receivable for customers, payable for vendors.
 * A party that is both shows its balance only in the list it runs towards.
 */
export function dueFor(role: PartyRole, party: Party) {
  if (!party.balanceSide) return party.outstanding;
  return (party.balanceSide === "receivable") === (role === "customer") ? party.outstanding : 0;
}

export function matchesPartySearch(party: Party, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [party.displayName, party.legalName, party.contactPerson, party.gstin, party.phone, placeOf(party), treatmentLabel(party.treatment)]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

export const ROLE_TEXT: Record<PartyRole, { one: string; many: string; path: string }> = {
  customer: { one: "customer", many: "customers", path: "/customers" },
  vendor: { one: "vendor", many: "vendors", path: "/vendors" },
};
