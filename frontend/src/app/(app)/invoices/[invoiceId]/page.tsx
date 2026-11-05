import type { Metadata } from "next";
import { Suspense } from "react";
import { InvoiceScreen } from "@/features/invoices/invoice-screens";

export const metadata: Metadata = { title: "Invoice" };

type InvoiceParams = PageProps<"/invoices/[invoiceId]">["params"];

// `params` is request data, so it is read inside a Suspense boundary.
export default function InvoicePage({ params }: { params: InvoiceParams }) {
  return (
    <Suspense>
      <InvoiceView params={params} />
    </Suspense>
  );
}

async function InvoiceView({ params }: { params: InvoiceParams }) {
  return <InvoiceScreen invoiceId={(await params).invoiceId} />;
}
