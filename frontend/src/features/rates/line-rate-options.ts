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
import type { RateSource, SheetEntry, SpecialRate } from "./types";

const money = (value: number) => Math.round(value * 100) / 100;

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
