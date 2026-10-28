import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { COMPANY_TAX_PROFILE } from "@/features/gst/company-tax-profile";
import { PartyForm } from "@/features/parties/party-form";
import { parties, priceLevels } from "@/features/parties/sample-data";

type PartyParams = PageProps<"/vendors/[partyId]">["params"];

const findVendor = (id: string) => parties.find((party) => party.id === id && party.roles.includes("vendor"));

export function generateStaticParams() {
  return parties.filter((party) => party.roles.includes("vendor")).map((party) => ({ partyId: party.id }));
}

export async function generateMetadata({ params }: { params: PartyParams }): Promise<Metadata> {
  return { title: findVendor((await params).partyId)?.displayName ?? "Vendor" };
}

// `params` is request data, so it is read inside a Suspense boundary.
export default function VendorPage({ params }: { params: PartyParams }) {
  return (
    <Suspense>
      <VendorDetail params={params} />
    </Suspense>
  );
}

async function VendorDetail({ params }: { params: PartyParams }) {
  const party = findVendor((await params).partyId);
  if (!party) notFound();

  return (
    <>
      <SampleDataNotice />
      <PartyForm role="vendor" party={party} priceLevels={priceLevels} companyState={COMPANY_TAX_PROFILE.stateCode} />
    </>
  );
}
