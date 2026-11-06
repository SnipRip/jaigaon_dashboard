import Link from "next/link";
import type { DrawSourceView } from "@/types/stock-moves";

const HREF: Record<DrawSourceView["kind"], string | null> = {
  bill: "/purchases",
  transfer: "/stock-transfers",
  adjustment: "/stock-adjustments",
  opening: null,
};

/** Where a slice of stock came from: a link to its bill, transfer or adjustment, or "Opening stock". */
export function DrawSourceLink({ source }: { source: DrawSourceView }) {
  const base = HREF[source.kind];
  if (!base || !source.id) return <>{source.label}</>;
  return (
    <Link href={`${base}/${source.id}`} className="text-brand hover:underline">
      {source.label}
    </Link>
  );
}
