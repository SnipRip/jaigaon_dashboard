import { FormMessage } from "./form-message";

/** What a screen shows while its records load from the backend, or if they could not. */
export function LoadNotice({ error, what }: { error?: unknown; what: string }) {
  if (error) {
    return <FormMessage tone="error" persistent>{error instanceof Error ? error.message : `Could not load ${what}. Check the connection and reload.`}</FormMessage>;
  }
  return <p className="text-[13px] font-medium text-muted">Loading {what}…</p>;
}
