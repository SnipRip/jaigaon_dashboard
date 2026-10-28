import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { COMPANY_TAX_PROFILE } from "@/features/gst/company-tax-profile";
import { items } from "@/features/items/sample-data";
import { parties } from "@/features/parties/sample-data";
import { BillDetail } from "@/features/purchases/bill-detail";
import { bills } from "@/features/purchases/sample-data";

type BillParams = PageProps<"/purchases/[billId]">["params"];

const findBill = (id: string) => bills.find((bill) => bill.id === id);

export function generateStaticParams() {
  return bills.map((bill) => ({ billId: bill.id }));
}

export async function generateMetadata({ params }: { params: BillParams }): Promise<Metadata> {
  return { title: findBill((await params).billId)?.reference ?? "Bill" };
}

// `params` is request data, so it is read inside a Suspense boundary.
export default function BillPage({ params }: { params: BillParams }) {
  return (
    <Suspense>
      <BillView params={params} />
    </Suspense>
  );
}

async function BillView({ params }: { params: BillParams }) {
  const bill = findBill((await params).billId);
  if (!bill) notFound();

  return (
    <>
      <SampleDataNotice />
      <BillDetail bill={bill} bills={bills} parties={parties} items={items} companyState={COMPANY_TAX_PROFILE.stateCode} />
    </>
  );
}
