import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { parties } from "@/features/parties/sample-data";
import { PartyLedger } from "@/features/payments/party-ledger";
import { payable, receivable } from "@/features/payments/payment-data";
import { ledgerRows } from "@/features/payments/payment-rules";
import { receipts, vendorPayments } from "@/features/payments/sample-data";

type LedgerParams = PageProps<"/payments/ledger/[partyId]">["params"];

const findParty = (id: string) => parties.find((party) => party.id === id);

export function generateStaticParams() {
  return parties.map((party) => ({ partyId: party.id }));
}

export async function generateMetadata({ params }: { params: LedgerParams }): Promise<Metadata> {
  return { title: `Ledger · ${findParty((await params).partyId)?.displayName ?? "Party"}` };
}

// `params` is request data, so it is read inside a Suspense boundary.
export default function LedgerPage({ params }: { params: LedgerParams }) {
  return (
    <Suspense>
      <Ledger params={params} />
    </Suspense>
  );
}

async function Ledger({ params }: { params: LedgerParams }) {
  const party = findParty((await params).partyId);
  if (!party) notFound();
  const mine = <T extends { partyId: string }>(rows: T[]) => rows.filter((row) => row.partyId === party.id);

  const sections = [
    party.roles.includes("customer") && {
      title: "as customer",
      balanceLabel: "Owes us",
      chargeLabel: "Invoiced",
      settleLabel: "Received",
      opening: party.openingBalance,
      rows: ledgerRows(party.openingBalance, mine(receivable), mine(receipts)),
    },
    party.roles.includes("vendor") && {
      title: "as vendor",
      balanceLabel: "We owe",
      chargeLabel: "Billed",
      settleLabel: "Paid",
      opening: party.openingBalance,
      rows: ledgerRows(party.openingBalance, mine(payable), mine(vendorPayments)),
    },
  ].filter((section) => section !== false);

  return (
    <>
      <SampleDataNotice />
      <PartyLedger partyName={party.displayName} sections={sections} />
    </>
  );
}
