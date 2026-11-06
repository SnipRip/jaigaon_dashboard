"use client";

import { Switch } from "radix-ui";
import { FormMessage } from "@/components/ui/form-message";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { useCurrentUser } from "@/features/auth/current-user-context";
import { saveSalesSettings, useSalesSettings } from "@/features/sales-settings/sales-settings-api";
import { useFormResult } from "./use-form-result";

// Company-wide sales behaviour. Everyone sees how it is set; only an
// administrator can change it (the backend refuses anyone else).
export function SalesSettingsCard() {
  const user = useCurrentUser();
  const isAdmin = user.role === "ADMIN";
  const { settings, error, mutate } = useSalesSettings();
  const { result, run } = useFormResult();

  async function toggle(invoiceInStockOnly: boolean) {
    await run(async () => mutate(await saveSalesSettings({ invoiceInStockOnly }), { revalidate: false }), "Sales settings saved");
  }

  return (
    <GlassCard aria-labelledby="settings-sales" className="flex flex-col gap-3.5">
      <CardTitle id="settings-sales">Sales</CardTitle>
      {error && <FormMessage tone="error">Sales settings could not be loaded.</FormMessage>}
      {settings && (
        <div className="flex items-start justify-between gap-3.5">
          <label htmlFor="invoice-in-stock-only" className="flex min-w-0 flex-col gap-0.5">
            <span className="text-sm font-semibold">Invoice: show only items in stock</span>
            <span className="text-xs text-muted">
              The item list on a new invoice shows only items that have stock in the chosen godown. When off, every item is listed, and issuing still refuses more than the godown holds.
              {!isAdmin && " Only an administrator can change this."}
            </span>
          </label>
          <Switch.Root
            id="invoice-in-stock-only"
            checked={settings.invoiceInStockOnly}
            disabled={!isAdmin}
            onCheckedChange={toggle}
            className="relative h-6 w-11 shrink-0 rounded-full bg-ink/20 transition-colors data-[state=checked]:bg-brand disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Switch.Thumb className="block size-5 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[22px]" />
          </Switch.Root>
        </div>
      )}
      {result && <FormMessage tone={result.tone}>{result.text}</FormMessage>}
    </GlassCard>
  );
}
