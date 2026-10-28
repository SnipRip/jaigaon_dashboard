import type { Metadata } from "next";
import { Suspense } from "react";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { COMPANY_TAX_PROFILE } from "@/features/gst/company-tax-profile";
import { hsnCodes } from "@/features/hsn/sample-data";
import { categories, itemGroups, items } from "@/features/items/sample-data";
import { parties } from "@/features/parties/sample-data";
import { BillForm } from "@/features/purchases/bill-form";
import { purchaseReference } from "@/features/purchases/purchase-rules";
import { bills, nextBillSequence } from "@/features/purchases/sample-data";

export const metadata: Metadata = { title: "New bill" };

type NewBillSearchParams = PageProps<"/purchases/new">["searchParams"];

const vendors = parties.filter((party) => party.roles.includes("vendor"));
const purchases = bills
  .filter((bill) => bill.kind === "goods" && bill.status !== "void")
  .map((bill) => ({ id: bill.id, label: `${bill.reference} · ${vendors.find((vendor) => vendor.id === bill.vendorId)?.displayName}` }));

// `?kind=charges&for=<bill>` opens a freight or labour bill already tagged
// to a purchase, from that purchase's landed cost card. `searchParams` is
// request data, so it is read inside a Suspense boundary.
export default function NewBillPage({ searchParams }: { searchParams: NewBillSearchParams }) {
  return (
    <>
      <SampleDataNotice />
      <Suspense>
        <NewBill searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function NewBill({ searchParams }: { searchParams: NewBillSearchParams }) {
  const { kind, for: target } = await searchParams;
  const initialFor = typeof target === "string" && purchases.some((purchase) => purchase.id === target) ? target : undefined;

  return (
    <BillForm
      vendors={vendors}
      catalog={{ categories, groups: itemGroups, items, hsnCodes }}
      purchases={purchases}
      companyState={COMPANY_TAX_PROFILE.stateCode}
      suggestedReference={purchaseReference("2026-27", nextBillSequence)}
      initialKind={kind === "charges" || initialFor ? "charges" : "goods"}
      initialFor={initialFor}
    />
  );
}
