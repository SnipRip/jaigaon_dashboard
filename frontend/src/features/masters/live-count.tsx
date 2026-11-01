"use client";

import useSWR from "swr";
import { apiGet } from "@/lib/api-client";
import { formatQuantity } from "@/lib/format";

/** "6 brands": how many records a list route returns, for the All masters cards. */
export function LiveCount({ path, noun: [one, many] }: { path: string; noun: [string, string] }) {
  const { data, error } = useSWR<unknown[]>(path, apiGet);
  if (error) return <>–</>;
  if (!data) return <>…</>;
  return (
    <>
      {formatQuantity(data.length)} {data.length === 1 ? one : many}
    </>
  );
}
