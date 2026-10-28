import type { Metadata } from "next";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { buildRegister, missingRegister, REGISTER_KIND_NAMES, type RegisterKind } from "@/features/documents/document-register";
import { DocumentsWorkspace } from "@/features/documents/documents-workspace";
import { COMPANY_TAX_PROFILE } from "@/features/gst/company-tax-profile";
import { DISPATCH_DOCUMENTS } from "@/features/invoices/dispatch-documents";
import { invoices } from "@/features/invoices/sample-data";
import { parties } from "@/features/parties/sample-data";
import { bills } from "@/features/purchases/sample-data";
import { shipments } from "@/features/shipments/sample-data";

export const metadata: Metadata = { title: "Export documents" };

const kinds: { value: RegisterKind; label: string }[] = [
  ...DISPATCH_DOCUMENTS.map((type) => ({ value: type.kind, label: type.name })),
  ...Object.entries(REGISTER_KIND_NAMES).map(([value, label]) => ({ value: value as RegisterKind, label })),
];

const owners = [
  ...invoices.map((invoice) => ({ value: invoice.id, label: `${invoice.number} · invoice` })),
  ...bills.map((bill) => ({ value: bill.id, label: `${bill.reference} · bill ${bill.vendorBillNumber}` })),
];

export default function DocumentsPage() {
  return (
    <>
      <SampleDataNotice />
      <DocumentsWorkspace
        entries={buildRegister(invoices, bills, shipments, parties)}
        missing={missingRegister(invoices, parties, COMPANY_TAX_PROFILE.stateCode).map(({ invoice, party, name }) => ({
          invoiceId: invoice.id,
          invoiceNumber: invoice.number,
          party,
          name,
        }))}
        kinds={kinds}
        owners={owners}
      />
    </>
  );
}
