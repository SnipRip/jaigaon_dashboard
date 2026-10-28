import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { GlassCard } from "@/components/ui/glass-card";

export interface MasterCard {
  href: string;
  title: string;
  icon: LucideIcon;
  /** What it holds, in one line. */
  description: string;
  /** e.g. "44 items · 6 groups" */
  count: string;
}

// The index of every master (agent/masters-plan.md), grouped as the plan
// groups them: one card per group, one row per master with its count.
export function MastersHub({ groups }: { groups: { label: string; cards: MasterCard[] }[] }) {
  return (
    <div className="grid items-start gap-3.5 xl:grid-cols-2">
      {groups.map((group) => (
        <GlassCard key={group.label} aria-label={group.label} className="flex flex-col p-1.5 sm:px-1.5">
          <h2 className="px-3 pt-2 pb-1.5 text-xs font-semibold text-muted">{group.label}</h2>
          <ul className="flex flex-col">
            {group.cards.map(({ href, title, icon: Icon, description, count }) => (
              <li key={href} className="border-t border-line first:border-t-0">
                <Link href={href} className="group flex items-center gap-3 rounded-(--radius-tile) px-3 py-2.5 transition-colors hover:bg-white/60">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-tint text-brand-strong">
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[13px] font-semibold">{title}</span>
                    <span className="text-xs leading-snug text-muted">{description}</span>
                  </span>
                  <span className="shrink-0 text-xs whitespace-nowrap text-ink-soft tabular-nums">{count}</span>
                  <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </GlassCard>
      ))}
    </div>
  );
}
