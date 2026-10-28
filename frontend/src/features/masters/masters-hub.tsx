import { ArrowRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";

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
// groups them. Each card links to its screen with a count of its records.
export function MastersHub({ groups }: { groups: { label: string; cards: MasterCard[] }[] }) {
  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <section key={group.label} className="flex flex-col gap-2.5">
          <h2 className="px-1 text-[11px] font-bold tracking-[0.08em] text-muted uppercase">{group.label}</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {group.cards.map(({ href, title, icon: Icon, description, count }) => (
              <Link key={href} href={href} className="group rounded-[26px]">
                <GlassCard interactive className="flex h-full flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-tint text-brand-strong">
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <CardTitle>{title}</CardTitle>
                    <ArrowRight aria-hidden="true" className="ml-auto size-5 text-muted transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <p className="text-sm font-medium text-muted">{description}</p>
                  <p className="mt-auto text-sm font-extrabold tabular-nums">{count}</p>
                </GlassCard>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
