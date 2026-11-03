"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { apiGet } from "@/lib/api-client";
import type { AccountHeadView } from "@/types/account-head";
import { ACCOUNT_HEADS_PATH, toAccountHead } from "./masters-api";

/** The live expense and income heads, for screens that pick one. */
export function useAccountHeads() {
  const { data, error } = useSWR<AccountHeadView[]>(ACCOUNT_HEADS_PATH, apiGet);
  const heads = useMemo(() => data?.map(toAccountHead), [data]);
  return { heads, error };
}
