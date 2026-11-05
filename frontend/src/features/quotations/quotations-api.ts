// Calls for quotations, and the conversion from the backend's quotation to
// the `Quotation` the screens and the printed copy read. The backend prices
// every line on save (rate source, schemes, GST, cost); `stored` keeps those
// figures so the screens show exactly what was saved.
import type { Issuer } from "@/features/invoices/invoice-document";
import { stateName } from "@/features/gst/indian-states";
import { apiRequest } from "@/lib/api-client";
import type { CompanyProfileView } from "@/types/company";
import type { QuotationStatusView, QuotationView } from "@/types/quotation";
import type { Quotation, QuotationStatus } from "./types";

export const QUOTATIONS_PATH = "/quotations";

export function toQuotation(view: QuotationView): Quotation {
  return {
    id: view.id,
    number: view.number,
    revision: view.revision,
    date: view.date,
    validUntil: view.validUntil,
    partyId: view.partyId,
    status: view.status.toLowerCase() as QuotationStatus,
    lines: view.lines.map((line) => ({
      itemId: line.itemId,
      description: line.description,
      hsn: line.hsn,
      quantity: line.quantity,
      unit: line.unit,
      rate: line.rate,
      discountPct: line.discountPct,
      gstRatePct: line.gstRatePct,
    })),
    terms: view.terms ?? "",
    notes: view.notes ?? undefined,
    history: view.history,
    stored: view,
  };
}

export interface QuotationBody {
  partyId: string;
  date: string;
  validUntil: string;
  status?: "DRAFT" | "SENT";
  terms: string | null;
  notes: string | null;
  lines: { itemId: string; quantity: number; rate: number; discountPct: number }[];
}

export const createQuotation = (body: QuotationBody) => apiRequest<QuotationView>(QUOTATIONS_PATH, { method: "POST", body });
export const reviseQuotation = (id: string, body: QuotationBody & { note: string }) =>
  apiRequest<QuotationView>(`${QUOTATIONS_PATH}/${id}`, { method: "PUT", body });
export const setQuotationStatus = (id: string, status: QuotationStatusView) =>
  apiRequest<QuotationView>(`${QUOTATIONS_PATH}/${id}/status`, { method: "POST", body: { status } });

/** Our company as the printed quotation shows it. */
export function issuerOf(profile: CompanyProfileView): Issuer {
  const place = [profile.addressLine, profile.city, profile.pin, profile.district ? `District ${profile.district}` : undefined, stateName(profile.stateCode)]
    .filter(Boolean)
    .join(", ");
  return {
    legalName: profile.legalName,
    address: place,
    phone: [profile.phone, profile.altPhone].filter(Boolean).join(" · "),
    email: profile.email ?? "",
    stateCode: profile.stateCode,
    gstin: profile.gstin ?? undefined,
    iec: profile.iec ?? undefined,
  };
}
