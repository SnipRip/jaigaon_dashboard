import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { GlassTable } from "@/components/ui/glass-table";
import { StatusChip } from "@/components/ui/status-chip";
import type { ExportDocumentType } from "./types";

// The documents every Bhutan export needs. Each one's number is entered on
// the screen in "Entered on", and the shipment shows which are still missing.
export function ExportDocumentsCard({ documents }: { documents: ExportDocumentType[] }) {
  return (
    <GlassCard className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <CardTitle>Documents each export needs</CardTitle>
        <p className="text-sm font-medium text-muted">
          The customs invoice, shipping bill, LEO, e-way bill and BRC from the accountant&apos;s walkthrough. A shipment is
          complete only when every number is in.
        </p>
      </div>
      <GlassTable className="min-w-[820px]">
        <thead>
          <tr>
            <th scope="col" className="text-left">Document</th>
            <th scope="col" className="text-left">Issued by</th>
            <th scope="col" className="text-left">What we record</th>
            <th scope="col" className="text-left">Needed</th>
            <th scope="col" className="text-left">Entered on</th>
          </tr>
        </thead>
        <tbody className="font-semibold">
          {documents.map((document) => (
            <tr key={document.id} className="align-top">
              <td className="text-left font-bold">{document.name}</td>
              <td className="text-left">{document.issuedBy}</td>
              <td className="text-left text-ink-soft">{document.holds}</td>
              <td className="text-left text-ink-soft">{document.whenNeeded}</td>
              <td className="text-left">
                <StatusChip tone="brand">{document.capturedOn}</StatusChip>
              </td>
            </tr>
          ))}
        </tbody>
      </GlassTable>
    </GlassCard>
  );
}
