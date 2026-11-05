// What a quotation or invoice line offers once an item is picked
// (agent/selling-rate-plan.md, section 3): the suggested rate (special, else
// today's sheet rate), today's sheet rate, the customer's special rate, and
// the last rate quoted and sold to this customer, each with its margin. The
// user picks one or types their own. No React. The backend gives the same
// figures from POST /rates/line-options; last quoted and last sold come from
// the stored documents once quotations and invoices are saved there. Until
// then the sample screens use this over their sample records.
import type { InvoiceLine } from "@/features/invoices/types";
import type { Item } from "@/features/items/types";
import { marginPct, rateFor, sheetEntryOn } from "./rate-rules";
import type { LineRateOptionsView } from "@/types/pricing";
import type { LineRateSourceView } from "@/types/quotation";
import type { RateSource, SheetEntry, SpecialRate } from "./types";

const money = (value: number) => Math.round(value * 100) / 100;

/** Where a saved quotation or invoice line's rate came from, in words. */
export const RATE_SOURCE_TEXT: Record<LineRateSourceView, string> = {
  SPECIAL: "Special rate",
  SHEET: "Today's rate",
  LAST_QUOTED: "Last quoted",
  LAST_SOLD: "Last sold",
  MANUAL: "Typed",
};

export type RateChoiceKind = "special" | "today" | "last-quoted" | "last-sold";

export interface RateChoice {
  kind: RateChoiceKind;
  rate: number;
  /** "Till 30 Nov", "QT/2627/0041 · 28 Oct". */
  detail: string;
}

export interface LineRateOptions {
  /** Filled in when the item is picked; undefined: the user types the rate. */
  suggested?: { rate: number; source: RateSource };
  /** In the order shown: special, today, last quoted, last sold. */
  choices: RateChoice[];
  /** With no sheet rate today: the latest entry that ended. A hint only. */
  previousSheetRate?: { rate: number; validTill: string };
  /** The minimum on today's sheet entry. */
  floor?: number;
  /** The last landed cost; undefined before any stock. */
  marginCost?: number;
}

/** A stored document line's rate, after its discount: what the customer paid per unit. */
export const netRate = (line: Pick<InvoiceLine, "rate" | "discountPct">) => money(line.rate * (1 - line.discountPct / 100));

interface PastDocument {
  number: string;
  date: string;
  partyId: string;
  lines: Pick<InvoiceLine, "itemId" | "rate" | "discountPct">[];
}

export interface RateHistory {
  /** Quotations that went to the customer (not drafts); a revision keeps its latest lines. */
  quotations: (PastDocument & { status: string })[];
  /** Invoices issued (not drafts or cancelled ones). */
  invoices: (PastDocument & { status: string })[];
}

export interface PricingSources {
  specialRates: SpecialRate[];
  rateSheet: SheetEntry[];
  history: RateHistory;
}

/** The latest document line for this customer and item: the history the line shows. */
function latest(documents: PastDocument[], partyId: string, itemId: string) {
  const found = documents
    .filter((document) => document.partyId === partyId)
    .flatMap((document) => document.lines.filter((line) => line.itemId === itemId).map((line) => ({ document, rate: netRate(line) })))
    .sort((a, b) => b.document.date.localeCompare(a.document.date))[0];
  return found && { rate: found.rate, number: found.document.number, date: found.document.date };
}

export function lineRateOptions(
  item: Pick<Item, "id" | "categoryId" | "subCategoryId" | "mrp" | "lastLandedCost">,
  partyId: string | undefined,
  date: string,
  sources: PricingSources,
  formatDate: (iso: string) => string,
): LineRateOptions {
  const today = sheetEntryOn(sources.rateSheet, item.id, date);
  const quote = rateFor(item, partyId, date, sources.specialRates, today);
  const choices: RateChoice[] = [];
  if (quote.special && quote.rate !== undefined) {
    choices.push({ kind: "special", rate: quote.rate, detail: quote.special.validTill ? `Till ${formatDate(quote.special.validTill)}` : "Until withdrawn" });
  }
  if (today) {
    choices.push({ kind: "today", rate: today.sellingPrice, detail: today.validFrom === today.validTill ? "Today only" : `Till ${formatDate(today.validTill)}` });
  }
  if (partyId) {
    const quoted = latest(
      sources.history.quotations.filter((quotation) => quotation.status !== "draft"),
      partyId,
      item.id,
    );
    if (quoted) choices.push({ kind: "last-quoted", rate: quoted.rate, detail: `${quoted.number} · ${formatDate(quoted.date)}` });
    const sold = latest(
      sources.history.invoices.filter((invoice) => invoice.status === "issued"),
      partyId,
      item.id,
    );
    if (sold) choices.push({ kind: "last-sold", rate: sold.rate, detail: `${sold.number} · ${formatDate(sold.date)}` });
  }
  const previous = today
    ? undefined
    : sources.rateSheet
        .filter((entry) => entry.itemId === item.id && entry.validTill < date)
        .sort((a, b) => b.validTill.localeCompare(a.validTill))[0];
  return {
    suggested: quote.rate !== undefined && quote.source ? { rate: quote.rate, source: quote.source } : undefined,
    choices,
    previousSheetRate: previous && { rate: previous.sellingPrice, validTill: previous.validTill },
    floor: today?.minSellingPrice,
    marginCost: item.lastLandedCost,
  };
}

/** The line's margin on the last landed cost, to one decimal; undefined before any stock. */
export const lineMargin = (rate: number, cost: number | undefined) =>
  cost === undefined ? undefined : Math.round(marginPct(rate, cost) * 10) / 10;

/** The backend's options for a line (POST /rates/line-options) in the shape the picker shows. */
export function toLineRateOptions(view: LineRateOptionsView, formatDate: (iso: string) => string): LineRateOptions {
  const choices: RateChoice[] = [];
  if (view.specialRate) {
    choices.push({ kind: "special", rate: view.specialRate.rate, detail: view.specialRate.validTill ? `Till ${formatDate(view.specialRate.validTill)}` : "Until withdrawn" });
  }
  if (view.todaysRate) {
    const entry = view.todaysRate;
    choices.push({ kind: "today", rate: entry.rate, detail: entry.validFrom === entry.validTill ? "Today only" : `Till ${formatDate(entry.validTill)}` });
  }
  if (view.lastQuoted) choices.push({ kind: "last-quoted", rate: view.lastQuoted.rate, detail: `${view.lastQuoted.number} · ${formatDate(view.lastQuoted.date)}` });
  if (view.lastSold) choices.push({ kind: "last-sold", rate: view.lastSold.rate, detail: `${view.lastSold.number} · ${formatDate(view.lastSold.date)}` });
  return {
    suggested: view.rate !== null && view.source ? { rate: view.rate, source: view.source } : undefined,
    choices,
    previousSheetRate: view.previousSheetRate ? { rate: view.previousSheetRate.rate, validTill: view.previousSheetRate.validTill } : undefined,
    floor: view.floor ?? undefined,
    marginCost: view.costs.lastLandedCost ?? undefined,
  };
}

/**
 * The kind of rate a line took, as schemes see it: the special rate, today's
 * rate, or anything else (typed, or a past document's rate). The backend
 * works out the same on save.
 */
export function schemeRateSource(rate: number, options: LineRateOptions | undefined): "SPECIAL" | "SHEET" | "MANUAL" {
  const choice = options?.choices.find((candidate) => Math.abs(candidate.rate - rate) < 0.005);
  return choice?.kind === "special" ? "SPECIAL" : choice?.kind === "today" ? "SHEET" : "MANUAL";
}
