import Link from "next/link";
import { findHsn, latestRate } from "./hsn-rules";
import type { HsnCode } from "./types";

/** What an HSN / SAC code means, from the master, under a field that holds one. */
export function HsnSummary({ codes, code }: { codes: HsnCode[]; code?: string }) {
  if (!code) return null;
  const hsn = findHsn(codes, code);
  if (!hsn) {
    return (
      <p className="rounded-(--radius-tile) bg-warning-tint/70 px-3.5 py-2 text-xs font-semibold text-warning-strong">
        {code} is not in the HSN / SAC master, so its GST rate cannot be checked.{" "}
        <Link href="/masters/hsn" className="underline">
          Open the master
        </Link>
      </p>
    );
  }
  return (
    <p className="glass-inset rounded-(--radius-tile) px-3.5 py-2 text-xs font-semibold text-ink-soft">
      <span className="font-semibold text-ink">
        {hsn.kind} {hsn.code} · {latestRate(hsn)}%
      </span>{" "}
      {hsn.description}
    </p>
  );
}
