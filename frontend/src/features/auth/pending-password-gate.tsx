"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { SETTINGS_PATH } from "@/config/auth";
import { useCurrentUser } from "./current-user-context";

// An account an administrator created (or reset) must choose its own
// password first. The backend refuses every other request until then; this
// sends the browser to Settings so the person sees why.
export function PendingPasswordGate() {
  const { mustChangePassword } = useCurrentUser();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (mustChangePassword && pathname !== SETTINGS_PATH) router.replace(SETTINGS_PATH);
  }, [mustChangePassword, pathname, router]);

  return null;
}
