import type { Metadata } from "next";
import { Suspense } from "react";
import { NewInvoiceScreen } from "@/features/invoices/invoice-screens";

export const metadata: Metadata = { title: "New export invoice" };

type SearchParams = PageProps<"/invoices/new/export">["searchParams"];

// `?quotation=<id>` starts the invoice from that quotation (Convert to
// invoice). `searchParams` is request data, so it is read inside Suspense.
export default function NewExportInvoicePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense>
      <Form searchParams={searchParams} />
    </Suspense>
  );
}

async function Form({ searchParams }: { searchParams: SearchParams }) {
  const { quotation } = await searchParams;
  return <NewInvoiceScreen kind="export" quotationId={typeof quotation === "string" ? quotation : undefined} />;
}
