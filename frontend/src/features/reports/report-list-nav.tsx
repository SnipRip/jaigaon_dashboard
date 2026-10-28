import clsx from "clsx";
import Link from "next/link";
import { GlassCard } from "@/components/ui/glass-card";
import { REPORT_GROUPS, type Report } from "./types";

// Every report, grouped, beside the one that is open, so switching report is
// one click instead of a trip back to the catalogue.
export function ReportListNav({ reports, activeId }: { reports: Pick<Report, "id" | "title" | "group">[]; activeId: string }) {
  return (
    <GlassCard as="nav" aria-label="Reports" className="flex flex-col gap-0.5 p-2 sm:px-2">
      {REPORT_GROUPS.map((group) => {
        const mine = reports.filter((report) => report.group === group);
        if (mine.length === 0) return null;
        return (
          <div key={group} className="flex flex-col gap-0.5">
            <h2 className="px-2 pt-2.5 pb-1 text-xs font-semibold text-muted first:pt-1">{group}</h2>
            {mine.map((report) => {
              const active = report.id === activeId;
              return (
                <Link
                  key={report.id}
                  href={`/reports/${report.id}`}
                  aria-current={active ? "page" : undefined}
                  className={clsx(
                    "rounded-md px-2 py-1.5 text-[13px] transition-colors",
                    active ? "glass-selected font-semibold" : "text-ink-soft hover:bg-white/60 hover:text-ink",
                  )}
                >
                  {report.title}
                </Link>
              );
            })}
          </div>
        );
      })}
    </GlassCard>
  );
}
