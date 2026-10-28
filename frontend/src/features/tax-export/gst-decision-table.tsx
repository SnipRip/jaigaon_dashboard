import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { GlassTable } from "@/components/ui/glass-table";
import { StatusChip } from "@/components/ui/status-chip";
import { describeComponents, purchaseTax, saleTax, type PartyTaxProfile } from "@/features/gst/gst-rules";
import { stateName } from "@/features/gst/indian-states";

interface Case {
  label: string;
  profile: PartyTaxProfile;
  /** Purchase only (e.g. a transporter), or sale only (e.g. consumer). */
  side?: "sale" | "purchase";
  /** When the example 18% does not fit, e.g. 5% truck freight. */
  ratePct?: number;
}

// The rules of gst-rules.ts written out for an 18% item, so the owner and the
// accountant can check them in one table.
export function GstDecisionTable({ companyState }: { companyState: string }) {
  const own = stateName(companyState);
  const cases: Case[] = [
    { label: `Registered, in ${own}`, profile: { treatment: "registered", stateCode: companyState } },
    { label: "Registered, in Assam", profile: { treatment: "registered", stateCode: "18" } },
    { label: "Composition dealer", profile: { treatment: "composition", stateCode: companyState } },
    { label: "Unregistered business", profile: { treatment: "unregistered", stateCode: companyState } },
    { label: `Consumer, in ${own}`, profile: { treatment: "consumer", stateCode: companyState }, side: "sale" },
    { label: "Bhutan buyer, under LUT", profile: { treatment: "overseas", exportRoute: "lut" }, side: "sale" },
    { label: "Bhutan buyer, IGST paid", profile: { treatment: "overseas", exportRoute: "igst" }, side: "sale" },
    { label: "Overseas supplier (import)", profile: { treatment: "overseas" }, side: "purchase" },
    {
      label: "Transport agency (GTA) freight, 5%",
      profile: { treatment: "registered", stateCode: companyState, isGta: true },
      side: "purchase",
      ratePct: 5,
    },
  ];

  return (
    <GlassCard className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <CardTitle>How GST is decided</CardTitle>
        <p className="text-sm font-medium text-muted">
          From the party&apos;s GST treatment and place of supply. Example: an item at 18%. Invoices and bills apply this on
          their own; nobody picks CGST or IGST by hand.
        </p>
      </div>
      <GlassTable className="min-w-[760px]">
        <thead>
          <tr>
            <th scope="col" className="text-left">Party</th>
            <th scope="col" className="text-left">When we sell to them</th>
            <th scope="col" className="text-left">When we buy from them</th>
          </tr>
        </thead>
        <tbody className="font-semibold">
          {cases.map(({ label, profile, side, ratePct = 18 }) => {
            const sale = side === "purchase" ? undefined : saleTax(companyState, profile);
            const purchase = side === "sale" ? undefined : purchaseTax(companyState, profile);
            return (
              <tr key={label} className="align-top">
                <td className="text-left font-bold">{label}</td>
                <td className="text-left">
                  {sale ? (
                    <>
                      <div className="font-bold">{describeComponents(ratePct, sale.regime)}</div>
                      <div className="text-xs text-muted">{sale.title}</div>
                    </>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="text-left">
                  {purchase ? (
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-bold">{describeComponents(ratePct, purchase.regime)}</span>
                      <StatusChip tone={purchase.itc ? "success" : "warning"}>
                        {purchase.itc ? "Input credit claimable" : "No input credit"}
                      </StatusChip>
                    </div>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </GlassTable>
    </GlassCard>
  );
}
