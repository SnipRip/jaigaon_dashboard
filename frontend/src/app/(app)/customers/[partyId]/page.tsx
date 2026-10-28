import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { COMPANY_TAX_PROFILE } from "@/features/gst/company-tax-profile";
import { PartyForm } from "@/features/parties/party-form";
import { parties, priceLevels } from "@/features/parties/sample-data";

type PartyParams = PageProps<"/customers/[partyId]">["params"];

const findCustomer = (id: string) => parties.find((party) => party.id === id && party.roles.includes("customer"));

export function generateStaticParams() {
  return parties.filter((party) => party.roles.includes("customer")).map((party) => ({ partyId: party.id }));
}

export async function generateMetadata({ params }: { params: PartyParams }): Promise<Metadata> {
  return { title: findCustomer((await params).partyId)?.displayName ?? "Customer" };
}

// `params` is request data, so it is read inside a Suspense boundary.
export default function CustomerPage({ params }: { params: PartyParams }) {
  return (
    <Suspense>
      <CustomerDetail params={params} />
    </Suspense>
  );
}

async function CustomerDetail({ params }: { params: PartyParams }) {
  const party = findCustomer((await params).partyId);
  if (!party) notFound();

  return (
    <>
      <SampleDataNotice />
      <PartyForm role="customer" party={party} priceLevels={priceLevels} companyState={COMPANY_TAX_PROFILE.stateCode} />
    </>
  );
}
