"use client";

import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { StatusChip } from "@/components/ui/status-chip";
import { signOut } from "@/features/auth/sign-out";
import { apiGet, apiRequest } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import type { SessionSummary } from "@/types/user";
import { describeDevice } from "./describe-device";
import { SESSIONS_PATH } from "./sessions-path";
import { useFormResult } from "./use-form-result";

// Every device the user is signed in on, with a way to sign each one out.
export function SessionsList() {
  const { data: sessions, error, isLoading, mutate } = useSWR<SessionSummary[]>(SESSIONS_PATH, apiGet);
  const { result, run } = useFormResult();

  const revoke = async (path: string, method: "POST" | "DELETE", successText: string) => {
    await run(() => apiRequest(path, { method }), successText);
    await mutate();
  };

  const hasOtherSessions = sessions?.some((session) => !session.isCurrent) ?? false;

  return (
    <GlassCard aria-labelledby="settings-sessions" className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2">
        <CardTitle id="settings-sessions">Signed-in devices</CardTitle>
        <Button
          variant="danger"
          disabled={!hasOtherSessions}
          onClick={() => revoke(`${SESSIONS_PATH}/revoke-others`, "POST", "Signed out of all other devices")}
        >
          Sign out of all other devices
        </Button>
      </div>

      {isLoading && <p className="py-3 text-sm font-semibold text-muted">Loading devices…</p>}
      {error && <FormMessage tone="error">Could not load your devices. Reload the page to try again.</FormMessage>}

      <ul className="flex flex-col">
        {sessions?.map((session) => (
          <li key={session.id} className="flex min-h-[60px] items-center justify-between gap-3 border-t border-line py-2">
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm font-semibold">{describeDevice(session.userAgent)}</span>
              <span className="text-xs font-semibold text-muted">
                {session.ipAddress ?? "Unknown address"} · last active {formatDateTime(session.lastSeenAt)}
              </span>
            </span>
            {session.isCurrent ? (
              <StatusChip tone="success">This device</StatusChip>
            ) : (
              <Button variant="neutral" onClick={() => revoke(`${SESSIONS_PATH}/${session.id}`, "DELETE", "Device signed out")}>
                Sign out
              </Button>
            )}
          </li>
        ))}
      </ul>

      {result && <FormMessage tone={result.tone}>{result.text}</FormMessage>}
      <Button variant="outline" onClick={signOut} className="mt-2 self-start">
        Sign out of this device
      </Button>
    </GlassCard>
  );
}
