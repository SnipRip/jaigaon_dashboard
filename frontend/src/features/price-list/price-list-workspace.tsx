"use client";

import { CalendarRange, Copy, Download, Save, SlidersHorizontal, Undo2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { FilterGroup } from "@/components/ui/filter-group";
import { FormMessage } from "@/components/ui/form-message";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassModal } from "@/components/ui/glass-modal";
import { ImportDialog } from "@/components/ui/import-dialog";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { SearchField } from "@/components/ui/search-field";
import { SelectField, type SelectOption } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { ViewTabs } from "@/components/ui/view-tabs";
import { addDays } from "@/lib/dates";
import { saveErrorText } from "@/lib/api-client";
import { formatDate, formatQuantity } from "@/lib/format";
import type { PriceSheetRowView, PriceSheetView } from "@/types/price-list";
import { BulkChangeDialog } from "./bulk-change-dialog";
import { applyBulk, changeCell, rowFigures, rowInput, type BulkChange, type EditField, type RowEdit } from "./price-edits";
import { copyPrices, downloadDaySheet, PRICE_LIST_MASTER, saveBulkPrices, type PriceDates } from "./price-list-api";
import { PriceHistoryDialog } from "./price-history-dialog";
import { PriceListTable, type TableRow } from "./price-list-table";

type Mode = "day" | "range";
type Show = "all" | "changed" | "listed" | "low-margin";

const MODES = [
  { value: "day", label: "This day only" },
  { value: "range", label: "Date range" },
] as const;

/** Rows drawn at a time; more on request, so a long list stays quick. */
const PAGE = 150;
const LOW_MARGIN = 8;
const ALL = "all";

interface PriceListWorkspaceProps {
  sheet: PriceSheetView;
  /** Category tree for the filter: top level with sub-categories. */
  categories: { id: string; name: string; subCategories: { id: string; name: string }[] }[];
  date: string;
  onDateChange: (date: string) => void;
  /** Reload the sheet after a save, import or history change. */
  onSaved: () => Promise<unknown>;
}

// The day-wise price list (agent/price-list-plan.md): pick a date, type the
// prices (or margins) of the items that changed, save them for that day or a
// range. Saved entries layer: the latest start wins on a date. The item
// master has no selling price, so a day without an entry has no rate.
export function PriceListWorkspace({ sheet, categories, date, onDateChange, onSaved }: PriceListWorkspaceProps) {
  const [edits, setEdits] = useState<Record<string, RowEdit>>({});
  const [loaded, setLoaded] = useState(sheet);
  if (loaded !== sheet) {
    // A new date or a reload after saving: typed cells were for the old figures.
    setLoaded(sheet);
    if (loaded.date !== sheet.date) setEdits({});
  }
  const [mode, setMode] = useState<Mode>("day");
  const [till, setTill] = useState(() => addDays(date, 6));
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL);
  const [show, setShow] = useState<Show>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [limit, setLimit] = useState(PAGE);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [history, setHistory] = useState<PriceSheetRowView | null>(null);

  const changedCount = Object.keys(edits).length;
  // Typed prices are lost if the page closes; the browser asks first.
  useEffect(() => {
    if (!changedCount) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [changedCount]);

  const tableRows: TableRow[] = useMemo(
    () => sheet.rows.map((row) => ({ row, edit: edits[row.itemId], figures: rowFigures(row, edits[row.itemId]) })),
    [sheet.rows, edits],
  );

  const categoryOptions: SelectOption[] = useMemo(
    () => [
      { value: ALL, label: "All categories" },
      ...categories.flatMap((top) => [
        { value: top.id, label: top.name },
        ...top.subCategories.map((sub) => ({ value: sub.id, label: `${top.name} › ${sub.name}` })),
      ]),
    ],
    [categories],
  );

  const needle = query.trim().toLowerCase();
  const visible = tableRows.filter(({ row, edit, figures }) => {
    if (category !== ALL && row.categoryId !== category && row.subCategoryId !== category) return false;
    if (needle && !`${row.name} ${row.sku ?? ""}`.toLowerCase().includes(needle)) return false;
    if (show === "changed") return edit !== undefined;
    if (show === "listed") return row.entry !== null;
    if (show === "low-margin") return figures.margin !== null && figures.margin < LOW_MARGIN;
    return true;
  });
  const drawn = visible.slice(0, limit);
  const problems = tableRows.filter(({ edit, figures }) => edit && figures.problem).length;
  const target = selected.size ? visible.filter(({ row }) => selected.has(row.itemId)) : visible;

  const dates: PriceDates = { validFrom: date, validTill: mode === "range" ? till : date };
  const rangeProblem = mode === "range" && till < date ? "Till is before the date shown" : null;
  const savingFor =
    mode === "day" ? `for ${formatDate(date)} only` : `from ${formatDate(date)} till ${till >= date ? formatDate(till) : "…"}`;

  const changeDate = (next: string) => {
    if (!next || next === date) return;
    if (changedCount && !window.confirm(`${changedCount} unsaved ${changedCount === 1 ? "change" : "changes"} will be dropped. Change the date?`)) return;
    setEdits({});
    setNotice(null);
    if (till < next) setTill(addDays(next, 6));
    onDateChange(next);
  };

  const run = async (work: () => Promise<string>) => {
    setBusy(true);
    setNotice(null);
    try {
      const text = await work();
      await onSaved();
      setNotice({ tone: "success", text });
    } catch (failure) {
      setNotice({ tone: "error", text: saveErrorText(failure) });
    } finally {
      setBusy(false);
    }
  };

  const save = () =>
    void run(async () => {
      const rows = tableRows.filter(({ edit }) => edit).map(({ row, edit, figures }) => rowInput(row, edit!, figures));
      const { saved } = await saveBulkPrices(dates, rows);
      setEdits({});
      return `${formatQuantity(saved)} ${saved === 1 ? "price" : "prices"} saved ${savingFor}.`;
    });

  const copyPrevious = () =>
    void run(async () => {
      const ids = selected.size ? [...selected] : undefined;
      const { saved } = await copyPrices(addDays(date, -1), dates, ids);
      setCopyOpen(false);
      return `${formatQuantity(saved)} ${saved === 1 ? "price" : "prices"} from ${formatDate(addDays(date, -1))} set ${savingFor}.`;
    });

  const applyChange = (change: BulkChange) =>
    setEdits((current) => {
      const next = { ...current };
      for (const { row, edit, figures } of target) next[row.itemId] = applyBulk(edit, figures, change);
      return next;
    });

  return (
    <div className="flex flex-col gap-4">
      <GlassCard className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-end gap-3">
          <TextField label="Prices on" type="date" value={date} onChange={(event) => changeDate(event.target.value)} className="w-[160px]" />
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted">Save changes for</span>
            <ViewTabs label="Save changes for" tabs={MODES} value={mode} onChange={setMode} className="border-b-0" />
          </div>
          {mode === "range" && (
            <TextField label="Till" type="date" min={date} value={till} error={rangeProblem ?? undefined} onChange={(event) => setTill(event.target.value)} className="w-[160px]" />
          )}
          <p className="flex items-center gap-1.5 pb-2 text-xs font-semibold text-muted">
            <CalendarRange aria-hidden="true" className="size-4" />
            Saving applies {savingFor}; after that the item has no rate until the next entry.
          </p>
        </div>

        <ListToolbar
          actions={
            <>
              <ImportDialog what="price list" master={PRICE_LIST_MASTER} />
              <Button variant="neutral" disabled={busy} onClick={() => void run(async () => (await downloadDaySheet(date), `Sheet for ${formatDate(date)} downloaded. Change the prices and import it back.`))}>
                <Download aria-hidden="true" />
                Sheet for this date
              </Button>
              <Button variant="neutral" disabled={busy} onClick={() => setCopyOpen(true)}>
                <Copy aria-hidden="true" />
                Copy previous day
              </Button>
              <Button variant="neutral" disabled={busy || target.length === 0} onClick={() => setBulkOpen(true)}>
                <SlidersHorizontal aria-hidden="true" />
                Change {selected.size ? "selected" : "shown"}
              </Button>
              <Button size="lg" disabled={busy || !changedCount || problems > 0 || rangeProblem !== null} onClick={save}>
                <Save aria-hidden="true" />
                Save {changedCount ? formatQuantity(changedCount) : ""} {changedCount === 1 ? "change" : "changes"}
              </Button>
            </>
          }
        >
          <SearchField id="price-list-search" label="Search items" value={query} onChange={setQuery} placeholder="Item or SKU" trailing={`${visible.length} of ${tableRows.length}`} className="min-w-[220px] flex-1" />
          <SelectField label="Category" options={categoryOptions} value={category} onValueChange={setCategory} className="w-[220px] [&>label]:sr-only" />
          <FilterGroup label="Show">
            <FilterChip selected={show === "all"} onClick={() => setShow("all")}>
              All
            </FilterChip>
            <FilterChip selected={show === "listed"} onClick={() => setShow("listed")}>
              On price list
            </FilterChip>
            <FilterChip selected={show === "changed"} onClick={() => setShow("changed")}>
              Not saved{changedCount ? ` (${changedCount})` : ""}
            </FilterChip>
            <FilterChip selected={show === "low-margin"} onClick={() => setShow("low-margin")}>
              Margin under {LOW_MARGIN}%
            </FilterChip>
          </FilterGroup>
        </ListToolbar>

        {(selected.size > 0 || changedCount > 0) && (
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-muted">
            {selected.size > 0 && (
              <span>
                {formatQuantity(selected.size)} selected ·{" "}
                <button type="button" className="text-brand hover:underline" onClick={() => setSelected(new Set())}>
                  clear
                </button>
              </span>
            )}
            {changedCount > 0 && (
              <button type="button" className="inline-flex items-center gap-1 text-brand hover:underline" onClick={() => setEdits({})}>
                <Undo2 aria-hidden="true" className="size-3.5" />
                Undo all {changedCount} changes
              </button>
            )}
            {problems > 0 && <span className="text-danger">{problems} {problems === 1 ? "row needs" : "rows need"} fixing before saving.</span>}
          </div>
        )}

        {notice && <FormMessage tone={notice.tone} result={notice}>{notice.text}</FormMessage>}

        <PriceListTable
          rows={drawn}
          selected={selected}
          onSelect={(ids, on) =>
            setSelected((current) => {
              const next = new Set(current);
              for (const id of ids) {
                if (on) next.add(id);
                else next.delete(id);
              }
              return next;
            })
          }
          onChange={(itemId: string, field: EditField, text: string) => setEdits((current) => ({ ...current, [itemId]: changeCell(current[itemId], field, text) }))}
          onHistory={setHistory}
        />
        {visible.length === 0 && (
          <p className="py-6 text-center text-[13px] text-muted">{tableRows.length ? "No items match." : "No items yet. Add them on the Items screen."}</p>
        )}
        {visible.length > drawn.length && (
          <div className="flex justify-center">
            <Button variant="neutral" onClick={() => setLimit((current) => current + PAGE)}>
              Show {formatQuantity(Math.min(PAGE, visible.length - drawn.length))} more of {formatQuantity(visible.length - drawn.length)}
            </Button>
          </div>
        )}
        <p className="text-xs font-semibold text-muted">
          Type a price or a margin; the other follows from the cost. Enter moves down a column. Blank MRP uses the item&apos;s, blank cost the last landed cost, blank minimum means none.
          Quotations and sales take a customer&apos;s special rate first, then this price.
        </p>
      </GlassCard>

      <BulkChangeDialog open={bulkOpen} onOpenChange={setBulkOpen} count={target.length} onApply={applyChange} />
      <PriceHistoryDialog row={history} date={date} onClose={() => setHistory(null)} onChanged={() => void onSaved()} />
      <GlassModal
        open={copyOpen}
        onOpenChange={setCopyOpen}
        title="Copy the previous day"
        description={`The price-list prices in force on ${formatDate(addDays(date, -1))} are saved again ${savingFor}${selected.size ? `, for the ${selected.size} selected items` : ""}. Items with no price that day stay without one.`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="neutral" onClick={() => setCopyOpen(false)}>
              Cancel
            </Button>
            <Button disabled={busy || rangeProblem !== null} onClick={copyPrevious}>
              Copy prices
            </Button>
          </div>
        }
      >
        {changedCount > 0 && <p className="text-[13px] text-muted">Your {changedCount} unsaved changes stay on the page. Saved later, they sit over the copied prices.</p>}
      </GlassModal>
    </div>
  );
}
