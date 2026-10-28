import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { COMPANY_TAX_PROFILE } from "@/features/gst/company-tax-profile";
import { InvoiceDetail } from "@/features/invoices/invoice-detail";
import { invoices } from "@/features/invoices/sample-data";
import { parties } from "@/features/parties/sample-data";
import { exportSettings } from "@/features/tax-export/sample-data";

type InvoiceParams = PageProps<"/invoices/[invoiceId]">["params"];

const findInvoice = (id: string) => invoices.find((invoice) => invoice.id === id);

export function generateStaticParams() {
  return invoices.map((invoice) => ({ invoiceId: invoice.id }));
}

export async function generateMetadata({ params }: { params: InvoiceParams }): Promise<Metadata> {
  return { title: findInvoice((await params).invoiceId)?.number ?? "Invoice" };
}

// `params` is request data, so it is read inside a Suspense boundary.
export default function InvoicePage({ params }: { params: InvoiceParams }) {
  return (
    <Suspense>
      <InvoiceView params={params} />
    </Suspense>
  );
}

async function InvoiceView({ params }: { params: InvoiceParams }) {
  const invoice = findInvoice((await params).invoiceId);
  const party = invoice && parties.find((candidate) => candidate.id === invoice.partyId);
  if (!invoice || !party) notFound();

  return (
    <>
      <SampleDataNotice />
      <InvoiceDetail
        initialInvoice={invoice}
        party={party}
        issuer={{ ...COMPANY_TAX_PROFILE, iec: COMPANY_TAX_PROFILE.iec ?? exportSettings.iec }}
      />
    </>
  );
}
