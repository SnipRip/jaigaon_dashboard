import type { Metadata } from "next";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { invoices } from "@/features/invoices/sample-data";
import { parties } from "@/features/parties/sample-data";
import { quotationLabel } from "@/features/quotations/quotation-rules";
import { quotations } from "@/features/quotations/sample-data";
import { optIns, sentMessages, templates } from "@/features/whatsapp/sample-data";
import { WhatsappWorkspace } from "@/features/whatsapp/whatsapp-workspace";

export const metadata: Metadata = { title: "WhatsApp" };

const partyName = (id: string) => parties.find((party) => party.id === id)?.displayName ?? id;

const documents = [
  ...quotations.map((quotation) => ({ value: quotation.id, label: `${quotationLabel(quotation)} · quotation · ${partyName(quotation.partyId)}` })),
  ...invoices.filter((invoice) => invoice.status === "issued").map((invoice) => ({ value: invoice.id, label: `${invoice.number} · invoice · ${partyName(invoice.partyId)}` })),
];

export default function WhatsappPage() {
  return (
    <>
      <SampleDataNotice />
      <WhatsappWorkspace
        templates={templates}
        optIns={optIns}
        messages={sentMessages}
        documents={documents}
        names={Object.fromEntries(parties.map((party) => [party.id, party.displayName]))}
      />
    </>
  );
}
