import type { Metadata } from "next";
import { Suspense } from "react";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { accountOptions, partyOptions, payable } from "@/features/payments/payment-data";
import { settlementNumber } from "@/features/payments/payment-rules";
import { nextSequence } from "@/features/payments/sample-data";
import { SettlementForm } from "@/features/payments/settlement-form";

export const metadata: Metadata = { title: "Pay a vendor" };

type SearchParams = PageProps<"/payments/vendor-payments/new">["searchParams"];

// `?bill=<id>` opens the form for that document. `searchParams` is request
// data, so it is read inside a Suspense boundary.
export default function NewVendorPaymentPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <SampleDataNotice />
      <Suspense>
        <Form searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Form({ searchParams }: { searchParams: SearchParams }) {
  const { bill } = await searchParams;
  return (
    <SettlementForm
      direction="out"
      parties={partyOptions("vendor")}
      documents={payable}
      accounts={accountOptions}
      suggestedNumber={settlementNumber("out", "2026-27", nextSequence.out)}
      initialDocumentId={typeof bill === "string" ? bill : undefined}
    />
  );
}
