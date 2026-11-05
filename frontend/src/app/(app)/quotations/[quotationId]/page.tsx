import type { Metadata } from "next";
import { Suspense } from "react";
import { QuotationScreen } from "@/features/quotations/quotation-screens";

export const metadata: Metadata = { title: "Quotation" };

type QuotationParams = PageProps<"/quotations/[quotationId]">["params"];

// `params` is request data, so it is read inside a Suspense boundary.
export default function QuotationPage({ params }: { params: QuotationParams }) {
  return (
    <Suspense>
      <QuotationView params={params} />
    </Suspense>
  );
}

async function QuotationView({ params }: { params: QuotationParams }) {
  return <QuotationScreen quotationId={(await params).quotationId} />;
}
