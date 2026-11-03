"use client";

import clsx from "clsx";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { FilterGroup } from "@/components/ui/filter-group";
import { FormMessage } from "@/components/ui/form-message";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { GlassModal } from "@/components/ui/glass-modal";
import { GlassTable } from "@/components/ui/glass-table";
import { ImportDialog } from "@/components/ui/import-dialog";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { SearchField } from "@/components/ui/search-field";
import { StatusChip } from "@/components/ui/status-chip";
import { ApiError } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { deleteHsnCode, removeHsnRate, saveHsnCode } from "./hsn-api";
import { HsnForm } from "./hsn-form";
import { latestRate, matchesHsnSearch } from "./hsn-rules";
import type { HsnFormValues } from "./hsn-schema";
import type { CodeKind, HsnCode } from "./types";

interface HsnWorkspaceProps {
  codes: HsnCode[];
  gstRates: number[];
  /** Reloads the master after a change. */
  onChanged: () => Promise<void>;
}

const errorText = (error: unknown) =>
  error instanceof ApiError ? error.message : "Could not save. Check the connection and try again.";

// The HSN / SAC master: list on the left, the picked code's editor and rate
// history on the right. Saved through the backend.
export function HsnWorkspace({ codes, gstRates, onChanged }: HsnWorkspaceProps) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<CodeKind | "all">("all");
  const [selectedCode, setSelectedCode] = useState(codes[0]?.code);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const visible = codes.filter((hsn) => (kind === "all" || hsn.kind === kind) && matchesHsnSearch(hsn, query));
  const selected = codes.find((hsn) => hsn.code === selectedCode);

  // Resolves to the error to show in the form, or null when saved.
  const save = (hsn: HsnCode | undefined) => async (values: HsnFormValues) => {
    try {
      await saveHsnCode(hsn, values);
      await onChanged();
    } catch (error) {
      return errorText(error);
    }
    setSelectedCode(values.code);
    setAdding(false);
    setNotice({ tone: "success", text: `${values.kind} ${values.code} saved.` });
    return null;
  };

  const run = async (call: () => Promise<unknown>, done: string) => {
    try {
      await call();
      await onChanged();
      setNotice({ tone: "success", text: done });
    } catch (error) {
      setNotice({ tone: "error", text: errorText(error) });
    }
  };

  return (
    <div className="grid items-start gap-3.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <GlassCard className="flex flex-col gap-3.5">
        <ListToolbar
          actions={
            <>
              <ImportDialog what="HSN / SAC codes" master="hsn-codes" />
              <Button size="lg" onClick={() => setAdding(true)}>
                <Plus aria-hidden="true" />
                New code
              </Button>
            </>
          }
        >
          <CardTitle>Codes · {codes.length}</CardTitle>
          <SearchField
            className="max-w-[340px] flex-[1_1_200px]"
            id="hsn-search"
            label="Search HSN and SAC codes"
            value={query}
            onChange={setQuery}
            placeholder="Search by code or description"
            trailing={`${visible.length} of ${codes.length}`}
          />
          <FilterGroup label="Code type">
            {(["all", "HSN", "SAC"] as const).map((option) => (
              <FilterChip key={option} selected={kind === option} onClick={() => setKind(option)}>
                {option === "all" ? "All codes" : option === "HSN" ? "HSN · goods" : "SAC · services"}
              </FilterChip>
            ))}
          </FilterGroup>
        </ListToolbar>
        <GlassTable className="min-w-[620px]">
          <thead>
            <tr className="text-right">
              <th scope="col" className="text-left">Code</th>
              <th scope="col" className="text-left">Description</th>
              <th scope="col">GST</th>
              <th scope="col">Items</th>
            </tr>
          </thead>
          <tbody className="text-right font-semibold tabular-nums">
            {visible.map((hsn) => (
              <tr key={hsn.code} className={clsx(hsn.code === selectedCode && "bg-brand-tint/60")}>
                <td className="text-left">
                  <button
                    type="button"
                    aria-pressed={hsn.code === selectedCode}
                    onClick={() => setSelectedCode(hsn.code)}
                    className="font-semibold text-brand hover:underline"
                  >
                    {hsn.code}
                  </button>
                  <div className="text-xs text-muted">{hsn.kind}</div>
                </td>
                <td className="text-left">
                  {hsn.description}
                  {hsn.reverseCharge && (
                    <span className="ml-1.5">
                      <StatusChip tone="warning">Reverse charge</StatusChip>
                    </span>
                  )}
                </td>
                <td className="font-semibold">{latestRate(hsn)}%</td>
                <td className="text-muted">{hsn.itemCount ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </GlassTable>
        {visible.length === 0 && <p className="py-6 text-center text-[13px] text-muted">No codes match.</p>}
        <p className="text-xs font-semibold text-muted">
          Items take their GST rate from the most specific code here that their HSN starts with: 72142090 uses 72142090 if
          it is listed, otherwise 721420, otherwise 7214. Shipping bills need the full 8-digit code on the item.
        </p>
      </GlassCard>

      <div className="flex flex-col gap-3.5 xl:sticky xl:top-3.5">
        {selected ? (
          <GlassCard className="flex flex-col gap-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>
                {selected.kind} {selected.code}
              </CardTitle>
              <StatusChip tone="brand">{latestRate(selected)}% GST</StatusChip>
              <span className="ml-auto text-xs font-medium text-muted">Used by {selected.itemCount ?? 0} items</span>
            </div>
            <HsnForm
              key={`${selected.code}-${selected.rates.map((rate) => rate.id).join()}`}
              hsn={selected}
              gstRates={gstRates}
              takenCodes={codes.map((hsn) => hsn.code)}
              onSave={save(selected)}
            />
            <div className="flex flex-col gap-2 border-t border-line pt-3">
              <span className="text-xs font-medium text-muted">Rate history</span>
              <ol className="flex flex-col gap-1.5">
                {[...selected.rates].reverse().map((change, index) => (
                  <li key={change.from} className="flex items-center justify-between gap-2 text-sm font-semibold">
                    <span>From {formatDate(change.from)}</span>
                    <span className="flex items-center gap-2 tabular-nums">
                      {change.ratePct}%{index === 0 && <StatusChip tone="success">Latest</StatusChip>}
                      {selected.rates.length > 1 && change.id && (
                        <button
                          type="button"
                          aria-label={`Remove the ${change.ratePct}% rate from ${formatDate(change.from)}`}
                          onClick={() => void run(() => removeHsnRate(selected, change.id!), `Rate from ${formatDate(change.from)} removed.`)}
                          className="glass-control glass-press flex size-7 items-center justify-center text-danger-strong hover:bg-danger-tint/80"
                        >
                          <Trash2 aria-hidden="true" className="size-3.5" />
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
              <p className="text-[11.5px] text-muted">Remove an entry only to fix a mistake: documents dated in its period would change rate.</p>
            </div>
            {!selected.itemCount && (
              <div className="border-t border-line pt-3">
                <Button
                  variant="danger"
                  onClick={() => void run(() => deleteHsnCode(selected), `${selected.kind} ${selected.code} deleted.`)}
                >
                  <Trash2 aria-hidden="true" className="size-[18px]" />
                  Delete code
                </Button>
              </div>
            )}
          </GlassCard>
        ) : (
          <GlassCard>
            <p className="text-sm font-semibold text-muted">Pick a code to see and edit it.</p>
          </GlassCard>
        )}
        {notice && <FormMessage tone={notice.tone}>{notice.text}</FormMessage>}
      </div>

      <GlassModal open={adding} onOpenChange={setAdding} title="New HSN or SAC code" description="Goods use HSN codes, services SAC codes.">
        {adding && (
          <HsnForm gstRates={gstRates} takenCodes={codes.map((hsn) => hsn.code)} onSave={save(undefined)} onCancel={() => setAdding(false)} />
        )}
      </GlassModal>
    </div>
  );
}
