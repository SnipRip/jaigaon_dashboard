"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { TextField } from "@/components/ui/text-field";
import { ApiError } from "@/lib/api-client";

interface CancelStockMoveProps {
  /** "transfer", "adjustment": for the button words. */
  noun: string;
  /** What a cancel does to the stock, under the reason. */
  effect: string;
  /** Why it cannot be cancelled any more, if so. */
  blocked?: string;
  onCancel: (reason: string) => Promise<unknown>;
}

// Cancelling a transfer or adjustment, with the reason it is kept under.
// The backend checks again that the stock can still be put back.
export function CancelStockMove({ noun, effect, blocked, onCancel }: CancelStockMoveProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (blocked) return <p className="text-xs font-semibold text-muted">{blocked}</p>;
  if (!open) {
    return (
      <Button variant="neutral" onClick={() => setOpen(true)}>
        Cancel this {noun}
      </Button>
    );
  }

  const cancel = async () => {
    if (reason.trim().length < 2) {
      setError("Say why it is cancelled.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onCancel(reason.trim());
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : "Could not cancel. Check the connection and try again.");
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <TextField label="Why it is cancelled" placeholder="Entered twice" value={reason} onChange={(event) => setReason(event.target.value)} />
      <div className="flex gap-2">
        <Button variant="danger" className="flex-1" disabled={busy} onClick={() => void cancel()}>
          {busy ? "Cancelling…" : `Cancel ${noun}`}
        </Button>
        <Button variant="neutral" disabled={busy} onClick={() => setOpen(false)}>
          Keep it
        </Button>
      </div>
      <p className="text-xs font-semibold text-muted">{effect}</p>
      {error && <FormMessage tone="error">{error}</FormMessage>}
    </div>
  );
}
