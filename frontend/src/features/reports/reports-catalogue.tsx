import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { formatQuantity } from "@/lib/format";
import type { Report } from "./types";

const GROUPS: Report["group"][] = ["Sales", "Purchases", "GST", "Stock", "Money", "Export"];

// Reports & MIS (SOW 16): every report, grouped, each opening in the same
// viewer with filters, totals, print and CSV download.
export function ReportsCatalogue({ reports }: { reports: Pick<Report, "id" | "title" | "group" | "description" | "rows">[] }) {
  return (
    <div className="flex flex-col gap-4">
      {GROUPS.map((group) => {
        const mine = reports.filter((report) => report.group === group);
        if (mine.length === 0) return null;
        return (
          <section key={group} className="flex flex-col gap-2.5">
            <h2 className="px-1 text-[11px] font-bold tracking-[0.08em] text-muted uppercase">{group}</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {mine.map((report) => (
                <Link key={report.id} href={`/reports/${report.id}`} className="group rounded-[26px]">
                  <GlassCard interactive className="flex h-full flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <CardTitle>{report.title}</CardTitle>
                      <ArrowRight aria-hidden="true" className="ml-auto size-5 text-muted transition-transform group-hover:translate-x-0.5" />
                    </div>
                    <p className="text-sm font-medium text-muted">{report.description}</p>
                    <p className="mt-auto text-xs font-bold text-ink-soft">{formatQuantity(report.rows.length)} rows in the sample</p>
                  </GlassCard>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
