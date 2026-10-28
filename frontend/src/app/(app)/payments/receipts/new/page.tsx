import type { Metadata } from "next";
import { Suspense } from "react";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { accountOptions, partyOptions, receivable } from "@/features/payments/payment-data";
import { settlementNumber } from "@/features/payments/payment-rules";
import { nextSequence } from "@/features/payments/sample-data";
import { SettlementForm } from "@/features/payments/settlement-form";

export const metadata: Metadata = { title: "Record a receipt" };

type SearchParams = PageProps<"/payments/receipts/new">["searchParams"];

// `?invoice=<id>` opens the form for that document. `searchParams` is request
// data, so it is read inside a Suspense boundary.
export default function NewReceiptPage({ searchParams }: { searchParams: SearchParams }) {
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
  const { invoice } = await searchParams;
  return (
    <SettlementForm
      direction="in"
      parties={partyOptions("customer")}
      documents={receivable}
      accounts={accountOptions}
      suggestedNumber={settlementNumber("in", "2026-27", nextSequence.in)}
      initialDocumentId={typeof invoice === "string" ? invoice : undefined}
    />
  );
}
