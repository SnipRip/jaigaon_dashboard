import type { Metadata } from "next";
import { Suspense } from "react";
import { NewBillScreen } from "@/features/purchases/purchase-screens";

export const metadata: Metadata = { title: "New bill" };

type NewBillSearchParams = PageProps<"/purchases/new">["searchParams"];

// `?kind=charges&for=<bill>` opens a freight or labour bill already tagged to
// a purchase (from its landed cost card); `?order=<id>` receives a purchase
// order. `searchParams` is request data, so it is read inside Suspense.
export default function NewBillPage({ searchParams }: { searchParams: NewBillSearchParams }) {
  return (
    <Suspense>
      <NewBill searchParams={searchParams} />
    </Suspense>
  );
}

async function NewBill({ searchParams }: { searchParams: NewBillSearchParams }) {
  const { kind, for: forBill, order } = await searchParams;
  const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);
  return <NewBillScreen kind={one(kind)} forBill={one(forBill)} orderId={one(order)} />;
}
