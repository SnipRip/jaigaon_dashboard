// Which GST applies to a sale or a purchase, decided from the party's GST
// treatment and place of supply, the way Zoho Books does it. No React here:
// invoices, bills and the party forms all call these.
//
// Sale inside our state → CGST + SGST (half the rate each); to another state
// → IGST (full rate); to a party outside India or an SEZ → zero-rated export,
// either under LUT (no tax) or with IGST paid and refunded later.
import { stateName } from "./indian-states";

export type GstTreatment = "registered" | "composition" | "unregistered" | "consumer" | "overseas" | "sez";
export type ExportRoute = "lut" | "igst";

export const GST_TREATMENTS: { value: GstTreatment; label: string; hint: string }[] = [
  { value: "registered", label: "Registered business, regular", hint: "Has a GSTIN and charges GST" },
  { value: "composition", label: "Registered business, composition", hint: "Has a GSTIN but issues a bill of supply without GST" },
  { value: "unregistered", label: "Unregistered business", hint: "No GSTIN" },
  { value: "consumer", label: "Consumer", hint: "An individual buying for own use" },
  { value: "overseas", label: "Overseas", hint: "Outside India, for example Bhutan" },
  { value: "sez", label: "Special Economic Zone", hint: "A unit or developer inside an SEZ" },
];

export const treatmentLabel = (treatment: GstTreatment) => GST_TREATMENTS.find((option) => option.value === treatment)?.label ?? treatment;

/** Treatments that come with a GSTIN. */
export const needsGstin = (treatment: GstTreatment) => treatment === "registered" || treatment === "composition" || treatment === "sez";

export type TaxComponent = { name: "CGST" | "SGST" | "IGST"; ratePct: number };

export type Regime = "intra-state" | "inter-state" | "export-lut" | "export-igst" | "no-gst" | "reverse-charge" | "import";

export interface TaxDecision {
  regime: Regime;
  /** One line for chips: "CGST + SGST". */
  title: string;
  /** Why, in a sentence. */
  detail: string;
  /** Can we claim this GST back as input tax credit? Purchases only. */
  itc?: boolean;
}

export interface PartyTaxProfile {
  treatment: GstTreatment;
  /** GST state code of the place of supply. Not used for overseas parties. */
  stateCode?: string;
  exportRoute?: ExportRoute;
  /** Vendor is a goods transport agency: freight falls under reverse charge. */
  isGta?: boolean;
}

export function saleTax(companyState: string, party: PartyTaxProfile): TaxDecision {
  if (party.treatment === "overseas" || party.treatment === "sez") {
    const where = party.treatment === "sez" ? "an SEZ" : "outside India";
    return party.exportRoute === "igst"
      ? {
          regime: "export-igst",
          title: "Export · IGST paid",
          detail: `Supply to ${where}. IGST is charged at the full rate, paid by us, and refunded once the shipping bill is filed.`,
        }
      : {
          regime: "export-lut",
          title: "Export under LUT · 0%",
          detail: `Supply to ${where}. Zero-rated under our LUT: no GST on the invoice, which must quote the LUT number.`,
        };
  }
  if (party.stateCode === companyState) {
    return {
      regime: "intra-state",
      title: "CGST + SGST",
      detail: `Place of supply ${stateName(party.stateCode)} is our own state, so the rate is split half CGST, half SGST.`,
    };
  }
  return {
    regime: "inter-state",
    title: "IGST",
    detail: `Place of supply ${stateName(party.stateCode) ?? "another state"} is outside our state, so the full rate is IGST.`,
  };
}

export function purchaseTax(companyState: string, vendor: PartyTaxProfile): TaxDecision {
  if (vendor.isGta) {
    return {
      regime: "reverse-charge",
      title: "Reverse charge",
      detail: "Freight from a goods transport agency: the transporter charges no GST, we pay it under reverse charge and claim it back.",
      itc: true,
    };
  }
  switch (vendor.treatment) {
    case "composition":
      return {
        regime: "no-gst",
        title: "Bill of supply · no GST",
        detail: "A composition dealer cannot charge GST. The full bill amount is our cost and there is nothing to claim back.",
        itc: false,
      };
    case "unregistered":
    case "consumer":
      return {
        regime: "no-gst",
        title: "No GST bill",
        detail: "No GSTIN, so no tax invoice. The full amount is our cost and there is no input tax credit.",
        itc: false,
      };
    case "overseas":
    case "sez":
      return {
        regime: "import",
        title: "Import · IGST at customs",
        detail: "IGST is paid at customs on the bill of entry and can be claimed back as input tax credit.",
        itc: true,
      };
    default:
      return vendor.stateCode === companyState
        ? {
            regime: "intra-state",
            title: "CGST + SGST",
            detail: "Vendor is in our state: GST bill with CGST + SGST, claimable as input tax credit.",
            itc: true,
          }
        : {
            regime: "inter-state",
            title: "IGST",
            detail: `Vendor is in ${stateName(vendor.stateCode) ?? "another state"}: GST bill with IGST, claimable as input tax credit.`,
            itc: true,
          };
  }
}

/** How a rate splits on the document. Empty when no GST is charged. */
export function taxComponents(ratePct: number, regime: Regime): TaxComponent[] {
  switch (regime) {
    case "intra-state":
      return [
        { name: "CGST", ratePct: ratePct / 2 },
        { name: "SGST", ratePct: ratePct / 2 },
      ];
    case "inter-state":
    case "export-igst":
    case "import":
      return [{ name: "IGST", ratePct }];
    default:
      return [];
  }
}

/** "CGST 9% + SGST 9%" or "No GST". */
export function describeComponents(ratePct: number, regime: Regime): string {
  if (regime === "reverse-charge") return `${ratePct}% paid by us under reverse charge`;
  const components = taxComponents(ratePct, regime);
  if (components.length === 0) return regime === "export-lut" ? "0% under LUT" : "No GST";
  return components.map((component) => `${component.name} ${component.ratePct}%`).join(" + ");
}
