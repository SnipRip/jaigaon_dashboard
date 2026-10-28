"use client";

import { useSyncExternalStore } from "react";

const noSubscribe = () => () => {};
const localToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

/**
 * Today's date (YYYY-MM-DD) in the viewer's time zone, or null while the
 * page is prerendered on the server, where reading the clock would freeze a
 * build-time date into a static page.
 */
export function useToday(): string | null {
  return useSyncExternalStore(noSubscribe, localToday, () => null);
}
