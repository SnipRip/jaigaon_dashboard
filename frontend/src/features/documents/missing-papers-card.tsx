import Link from "next/link";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { StatusChip } from "@/components/ui/status-chip";
import { documentName } from "@/features/shipments/shipments-api";
import type { MissingPaperView } from "@/types/document-register";
import { NEEDED_BY_LABEL } from "./documents-api";

/** Missing papers grouped by invoice; invoices holding a truck first, then oldest first (the server sends them by date). */
function byInvoice(missing: MissingPaperView[]) {
  const groups = new Map<string, MissingPaperView[]>();
  for (const paper of missing) groups.set(paper.invoice.id, [...(groups.get(paper.invoice.id) ?? []), paper]);
  return [...groups.values()].sort((a, b) => Number(b.some((paper) => paper.holdsTruck)) - Number(a.some((paper) => paper.holdsTruck)));
}

// Required papers not yet attached on issued invoices, by the same rules the
// shipment stages use. Each is attached on its invoice's page.
export function MissingPapersCard({ missing }: { missing: MissingPaperView[] }) {
  return (
    <GlassCard className="flex flex-col gap-3 xl:sticky xl:top-3.5">
      <CardTitle>Still to attach</CardTitle>
      {missing.length === 0 ? (
        <p className="text-sm font-semibold text-success-strong">Every issued invoice has its required papers.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {byInvoice(missing).map((papers) => {
            const { invoice, partyName, shipment } = papers[0];
            return (
              <li key={invoice.id} className="glass-inset flex flex-col gap-1.5 rounded-(--radius-tile) px-4 py-3">
                <span className="text-xs font-semibold text-muted">
                  <Link href={`/invoices/${invoice.id}`} className="text-sm font-semibold text-brand hover:underline">
                    {invoice.number}
                  </Link>{" "}
                  · {partyName}
                  {shipment ? (
                    <>
                      {" · "}
                      <Link href={`/shipments/${shipment.id}`} className="hover:underline">
                        {shipment.number}
                      </Link>
                    </>
                  ) : (
                    invoice.kind === "EXPORT" && " · not on a truck yet"
                  )}
                </span>
                <ul className="flex flex-col gap-1">
                  {papers.map((paper) => (
                    <li key={paper.kind} className="flex items-center justify-between gap-2 text-[13px]">
                      <span className="font-semibold">
                        {documentName(paper.kind)}
                        <span className="block text-xs font-medium text-muted">{NEEDED_BY_LABEL[paper.neededBy]}</span>
                      </span>
                      {paper.holdsTruck && <StatusChip tone="danger">Holds truck</StatusChip>}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
    </GlassCard>
  );
}
