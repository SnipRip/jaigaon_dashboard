// Calls for the customer and vendor master, and the conversion between the
// backend's party and the one the screens use.
import type { ExportRoute, GstTreatment } from "@/features/gst/gst-rules";
import { apiRequest } from "@/lib/api-client";
import type { PartyView } from "@/types/party";
import type { PartyFormValues } from "./party-schema";
import type { Party, PartyRole } from "./types";

export const PARTIES_PATH = "/parties";
/** One list for both screens, archived parties included (behind the Archived filter). */
export const PARTIES_LIST_PATH = `${PARTIES_PATH}?includeArchived=true`;

const orUndefined = <T,>(value: T | null) => value ?? undefined;

export function toParty(view: PartyView): Party {
  const roles: PartyRole[] = [...(view.isCustomer ? ["customer" as const] : []), ...(view.isVendor ? ["vendor" as const] : [])];
  return {
    id: view.id,
    roles,
    kind: view.kind === "INDIVIDUAL" ? "individual" : "business",
    displayName: view.displayName,
    legalName: orUndefined(view.legalName),
    contactPerson: orUndefined(view.contactPerson),
    phone: orUndefined(view.phone),
    email: orUndefined(view.email),
    treatment: view.treatment.toLowerCase() as GstTreatment,
    gstin: orUndefined(view.gstin),
    pan: orUndefined(view.pan),
    placeOfSupply: orUndefined(view.placeOfSupply),
    foreignTaxId: orUndefined(view.foreignTaxId),
    currency: view.currency,
    exportRoute: view.exportRoute ? (view.exportRoute.toLowerCase() as ExportRoute) : undefined,
    billing: {
      line1: view.addressLine ?? "",
      city: view.city ?? "",
      stateCode: orUndefined(view.placeOfSupply),
      country: orUndefined(view.country),
      pin: orUndefined(view.pin),
    },
    creditDays: view.creditDays,
    creditLimit: orUndefined(view.creditLimit),
    openingBalance: view.openingBalance,
    balanceSide: view.openingBalanceSide === "RECEIVABLE" ? "receivable" : "payable",
    udyamNumber: orUndefined(view.udyamNumber),
    isGta: view.isGta,
    transin: orUndefined(view.transin),
    bankAccount: view.bankAccountNumber
      ? { name: view.bankName ?? "", number: view.bankAccountNumber, ifsc: view.ifsc ?? "" }
      : undefined,
    outstanding: Math.abs(view.balance),
    notes: orUndefined(view.notes),
    archived: view.isArchived,
  };
}

const orNull = (text: string) => text.trim() || null;
const amountOrNull = (text: string) => (text.trim() === "" ? null : Number(text));

// Form values → request body. Fields that do not apply to the treatment or
// roles are sent as null; the backend clears them too.
function partyBody(values: PartyFormValues) {
  const overseas = values.treatment === "overseas";
  const withGstin = values.treatment === "registered" || values.treatment === "composition" || values.treatment === "sez";
  const isCustomer = values.roles.includes("customer");
  const isVendor = values.roles.includes("vendor");
  return {
    isCustomer,
    isVendor,
    kind: values.kind.toUpperCase(),
    displayName: values.displayName,
    legalName: orNull(values.legalName),
    contactPerson: orNull(values.contactPerson),
    phone: orNull(values.phone),
    email: orNull(values.email),
    treatment: values.treatment.toUpperCase(),
    gstin: withGstin ? orNull(values.gstin) : null,
    pan: withGstin ? orNull(values.pan) : null,
    placeOfSupply: overseas ? null : orNull(values.placeOfSupply),
    country: overseas ? orNull(values.country) : null,
    foreignTaxId: overseas ? orNull(values.foreignTaxId) : null,
    currency: overseas ? values.currency : "INR",
    exportRoute: overseas && isCustomer ? values.exportRoute.toUpperCase() : null,
    isGta: isVendor && values.isGta,
    transin: isVendor && !withGstin ? orNull(values.transin) : null,
    addressLine: orNull(values.addressLine),
    city: orNull(values.city),
    pin: overseas ? null : orNull(values.pin),
    creditDays: Number(values.creditDays),
    creditLimit: isCustomer ? amountOrNull(values.creditLimit) : null,
    openingBalance: amountOrNull(values.openingBalance) ?? 0,
    openingBalanceSide: values.openingBalanceSide.toUpperCase(),
    udyamNumber: isVendor ? orNull(values.udyamNumber) : null,
    bankName: isVendor ? orNull(values.bankName) : null,
    bankAccountNumber: isVendor ? orNull(values.bankAccount) : null,
    ifsc: isVendor ? orNull(values.ifsc) : null,
    notes: orNull(values.notes),
  };
}

export function saveParty(party: Party | undefined, values: PartyFormValues) {
  const body = partyBody(values);
  return party
    ? apiRequest<PartyView>(`${PARTIES_PATH}/${party.id}`, { method: "PATCH", body })
    : apiRequest<PartyView>(PARTIES_PATH, { method: "POST", body });
}

export const setPartyArchived = (party: Party, archived: boolean) =>
  apiRequest<PartyView>(`${PARTIES_PATH}/${party.id}`, { method: "PATCH", body: { isArchived: archived } });
