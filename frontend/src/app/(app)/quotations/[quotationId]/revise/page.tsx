import type { Metadata } from "next";
import { Suspense } from "react";
import { ReviseQuotationScreen } from "@/features/quotations/quotation-screens";

export const metadata: Metadata = { title: "Revise quotation" };

type QuotationParams = PageProps<"/quotations/[quotationId]/revise">["params"];

export default function ReviseQuotationPage({ params }: { params: QuotationParams }) {
  return (
    <Suspense>
      <Revise params={params} />
    </Suspense>
  );
}

async function Revise({ params }: { params: QuotationParams }) {
  return <ReviseQuotationScreen quotationId={(await params).quotationId} />;
}
