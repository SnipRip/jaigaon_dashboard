import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { StatusChip } from "@/components/ui/status-chip";
import { describeComponents, purchaseTax, saleTax, type PartyTaxProfile } from "@/features/gst/gst-rules";
import type { PartyRole } from "./types";

interface PartyTaxPreviewProps {
  companyState: string;
  profile: PartyTaxProfile;
  roles: PartyRole[];
}

// Live answer to "what tax goes on documents with this party?", recomputed
// as the GST treatment, GSTIN or place of supply changes.
export function PartyTaxPreview({ companyState, profile, roles }: PartyTaxPreviewProps) {
  const sale = roles.includes("customer") ? saleTax(companyState, profile) : undefined;
  const purchase = roles.includes("vendor") ? purchaseTax(companyState, profile) : undefined;

  return (
    <GlassCard className="flex flex-col gap-3.5">
      <CardTitle>Tax on documents</CardTitle>
      {!sale && !purchase && <p className="text-sm font-semibold text-muted">Pick customer or vendor to see the tax.</p>}
      {sale && (
        <section className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">Our invoices to them · item at 18%</span>
          <span className="text-lg font-semibold">{describeComponents(18, sale.regime)}</span>
          <StatusChip tone="brand">{sale.title}</StatusChip>
          <p className="text-xs font-semibold text-ink-soft">{sale.detail}</p>
        </section>
      )}
      {purchase && (
        <section className="flex flex-col gap-1.5 border-t border-line pt-3 first:border-0 first:pt-0">
          <span className="text-xs font-medium text-muted">Their bills to us · item at 18%</span>
          <span className="text-lg font-semibold">{describeComponents(18, purchase.regime)}</span>
          <div className="flex flex-wrap gap-1.5">
            <StatusChip tone="brand">{purchase.title}</StatusChip>
            <StatusChip tone={purchase.itc ? "success" : "warning"}>
              {purchase.itc ? "Input credit claimable" : "No input credit"}
            </StatusChip>
          </div>
          <p className="text-xs font-semibold text-ink-soft">{purchase.detail}</p>
        </section>
      )}
    </GlassCard>
  );
}
