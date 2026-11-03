"use client";

import { Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { GlassModal } from "@/components/ui/glass-modal";
import { GlassTable } from "@/components/ui/glass-table";
import { SelectField } from "@/components/ui/select-field";
import { StatusChip } from "@/components/ui/status-chip";
import { TextField } from "@/components/ui/text-field";
import { Tooltip } from "@/components/ui/tooltip";
import { apiGet, saveErrorText } from "@/lib/api-client";
import { financialYearOf } from "@/lib/financial-year";
import { formatDate } from "@/lib/format";
import type { IssuedNumberView, NumberFormatView, NumberingMethod, NumberSeriesView } from "@/types/number-series";
import { FormatForm } from "./format-form";
import { isMasterCode, KINDS, METHODS, resetLabel } from "./number-kinds";
import { deleteFormat, issuedPath, saveSeriesSettings } from "./number-series-api";

type Notice = { tone: "success" | "error"; text: string };

interface SeriesPanelProps {
  series: NumberSeriesView;
  today: string;
  /** Reloads the list after a change. */
  onChanged: () => Promise<unknown>;
}

// One kind's numbering: how numbers are given, the Tally voucher type, its
// formats over time and the latest numbers given out.
export function SeriesPanel({ series, today, onChanged }: SeriesPanelProps) {
  const kind = KINDS[series.kind];
  // undefined: dialog closed; null: adding; a format: editing it.
  const [editing, setEditing] = useState<NumberFormatView | null | undefined>(undefined);
  const [notice, setNotice] = useState<Notice | null>(null);
  const financialYear = financialYearOf(today);
  const issued = useSWR<IssuedNumberView[]>(issuedPath(series, financialYear), apiGet);

  const changed = async (text: string) => {
    await Promise.all([onChanged(), issued.mutate()]);
    setEditing(undefined);
    setNotice({ tone: "success", text });
  };
  const remove = async (format: NumberFormatView) => {
    try {
      await deleteFormat(series, format.id);
      await changed(`Format from ${formatDate(format.applicableFrom)} deleted.`);
    } catch (failure) {
      setNotice({ tone: "error", text: saveErrorText(failure) });
    }
  };

  return (
    <GlassCard className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <CardTitle>{kind.label}</CardTitle>
        {kind.gst && <StatusChip tone="brand">GST document</StatusChip>}
        <Button variant="outline" className="ml-auto" onClick={() => setEditing(null)}>
          <Plus aria-hidden="true" />
          {series.formats.length ? "Change format from a date" : "Set up numbering"}
        </Button>
      </div>

      <SettingsForm key={`${series.id} ${series.method} ${series.tallyVoucherType}`} series={series} onSaved={() => changed(`${kind.label} settings saved.`)} />

      {series.formats.length === 0 ? (
        <p className="text-sm font-semibold text-muted">
          No format yet. Until one is added, {kind.label.toLowerCase()} entries cannot take a number.
        </p>
      ) : (
        <GlassTable className="min-w-[620px]">
          <thead>
            <tr>
              <th scope="col" className="text-left">Applies from</th>
              <th scope="col" className="text-left">Pattern</th>
              <th scope="col" className="text-right">Starts at</th>
              <th scope="col" className="text-left">Restarts</th>
              <th scope="col" className="text-right">Given out</th>
              <th scope="col"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="font-semibold tabular-nums">
            {series.formats.map((format) => (
              <tr key={format.id}>
                <td className="text-left whitespace-nowrap">
                  <span className="inline-flex items-center gap-2">
                    {formatDate(format.applicableFrom)}
                    {series.current?.formatId === format.id && <StatusChip tone="success">In force</StatusChip>}
                  </span>
                </td>
                <td className="text-left whitespace-nowrap"><code>{format.pattern}</code></td>
                <td className="text-right">{format.startNumber}</td>
                <td className="text-left">{resetLabel(format.reset)}</td>
                <td className="text-right">{format.issuedCount}</td>
                <td className="text-right whitespace-nowrap">
                  {format.locked ? (
                    <Tooltip label="Has given out numbers, so it stays as it is">
                      <span className="inline-flex size-8 items-center justify-center text-muted">
                        <Lock aria-label="Locked" className="size-4" />
                      </span>
                    </Tooltip>
                  ) : (
                    <span className="inline-flex gap-1.5">
                      <IconButton label={`Edit the format from ${formatDate(format.applicableFrom)}`} onClick={() => setEditing(format)}>
                        <Pencil aria-hidden="true" className="size-4" />
                      </IconButton>
                      <IconButton label={`Delete the format from ${formatDate(format.applicableFrom)}`} onClick={() => void remove(format)} danger>
                        <Trash2 aria-hidden="true" className="size-4" />
                      </IconButton>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </GlassTable>
      )}

      <IssuedList kind={series.kind} rows={issued.data} />
      {notice && <FormMessage tone={notice.tone}>{notice.text}</FormMessage>}

      <GlassModal
        open={editing !== undefined}
        onOpenChange={(open) => !open && setEditing(undefined)}
        title={editing ? `Format from ${formatDate(editing.applicableFrom)}` : series.formats.length ? "New format from a date" : `Set up ${kind.label.toLowerCase()} numbers`}
        description={
          series.formats.length && !editing
            ? "The current format keeps the numbers it gave. Entries dated from this day take the new one, starting its own count."
            : "Entries dated from this day take this format."
        }
      >
        {editing !== undefined && (
          <FormatForm
            key={editing?.id ?? "new"}
            series={series}
            format={editing ?? undefined}
            today={today}
            onCancel={() => setEditing(undefined)}
            onSaved={(values) => changed(`Format from ${formatDate(values.applicableFrom)} saved.`)}
          />
        )}
      </GlassModal>
    </GlassCard>
  );
}

// How numbers are given (Tally's numbering method) and the voucher type
// these entries go to when synced to Tally.
function SettingsForm({ series, onSaved }: { series: NumberSeriesView; onSaved: () => Promise<void> }) {
  const [method, setMethod] = useState<NumberingMethod>(series.method);
  const [tallyVoucherType, setTallyVoucherType] = useState(series.tallyVoucherType ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const dirty = method !== series.method || tallyVoucherType.trim() !== (series.tallyVoucherType ?? "");
  const code = isMasterCode(series.kind);

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      await saveSeriesSettings(series, method, tallyVoucherType);
      await onSaved();
    } catch (failure) {
      setError(saveErrorText(failure));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid items-end gap-3.5 md:grid-cols-[1fr_1fr_auto]">
        <SelectField label="How numbers are given" options={METHODS} value={method} onValueChange={(value) => setMethod(value as NumberingMethod)} />
        {code ? (
          <p className="text-xs font-medium text-muted md:pb-2">Codes go to Tally as the ledger or stock item alias.</p>
        ) : (
          <TextField
            label="Tally voucher type"
            hint="As named in Tally; blank if not synced"
            value={tallyVoucherType}
            onChange={(event) => setTallyVoucherType(event.target.value)}
            maxLength={60}
          />
        )}
        <Button onClick={() => void save()} disabled={!dirty || saving}>
          Save
        </Button>
      </div>
      {error && <FormMessage tone="error">{error}</FormMessage>}
    </div>
  );
}

function IssuedList({ kind, rows }: { kind: NumberSeriesView["kind"]; rows?: IssuedNumberView[] }) {
  if (!rows || rows.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-semibold text-muted">
        Latest numbers {isMasterCode(kind) ? "given" : "this financial year"} · {rows.length === 500 ? "newest 500" : rows.length}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {rows.slice(0, 12).map((row) => (
          <span
            key={row.id}
            title={`${formatDate(row.documentDate)}${row.formatId ? "" : " · typed"}${row.status === "CANCELLED" ? " · cancelled" : ""}`}
            className={
              row.status === "CANCELLED"
                ? "glass-control rounded-(--radius-control) px-2 py-0.5 text-xs font-semibold text-muted line-through tabular-nums"
                : "glass-control rounded-(--radius-control) px-2 py-0.5 text-xs font-semibold tabular-nums"
            }
          >
            {row.number}
          </span>
        ))}
      </div>
    </div>
  );
}

function IconButton({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: ReactNode }) {
  return (
    <Tooltip label={label}>
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        className={
          danger
            ? "glass-control glass-press flex size-8 items-center justify-center text-danger-strong hover:bg-danger-tint/80"
            : "glass-control glass-press flex size-8 items-center justify-center text-ink-soft hover:bg-white/80"
        }
      >
        {children}
      </button>
    </Tooltip>
  );
}
