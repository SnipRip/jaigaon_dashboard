import { ArrowRight, Globe, Receipt, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { GlassCard } from "@/components/ui/glass-card";

const KINDS: { href: string; icon: LucideIcon; title: string; lines: string[] }[] = [
  {
    href: "/invoices/new/local",
    icon: Receipt,
    title: "Local tax invoice",
    lines: [
      "Buyer in India",
      "CGST + SGST inside West Bengal, IGST for other states",
      "E-way bill above ₹50,000",
    ],
  },
  {
    href: "/invoices/new/export",
    icon: Globe,
    title: "Export invoice",
    lines: [
      "Buyer in Bhutan or abroad",
      "No GST under LUT, LUT number printed on the bill",
      "Then attach challan, e-way bill, customs invoice, shipping bill, LEO, BRC",
    ],
  },
];

// The first question when billing: is this a local sale or an export?
export function InvoiceKindPicker() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {KINDS.map(({ href, icon: Icon, title, lines }) => (
        <Link key={href} href={href} className="group rounded-[26px]">
          <GlassCard interactive className="flex h-full flex-col gap-4 p-7">
            <div className="flex items-center gap-3">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-tint text-brand-strong">
                <Icon aria-hidden="true" className="size-7" />
              </span>
              <span className="text-xl font-bold tracking-tight">{title}</span>
              <ArrowRight aria-hidden="true" className="ml-auto size-6 text-muted transition-transform group-hover:translate-x-1" />
            </div>
            <ul className="flex flex-col gap-1.5 text-sm font-semibold text-ink-soft">
              {lines.map((line) => (
                <li key={line}>· {line}</li>
              ))}
            </ul>
          </GlassCard>
        </Link>
      ))}
    </div>
  );
}
