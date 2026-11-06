// Which papers an invoice must carry and the state of each, pure. Built on
// the same rules the shipment stages use (shipments/shipment-rules.ts) and
// the dispatch document rules (invoices/dispatch-document-rules.ts), so the
// register never asks for a paper a truck would not, or the other way round.
import type { DispatchDocumentKind, GstTreatment, InvoiceKind, ShipmentStage } from '../generated/prisma/enums.js';
import { documentKindProblem, DOCUMENT_RULES, needsEinvoice } from '../invoices/dispatch-document-rules.js';
import { EWAY_BILL_LIMIT, nextStage, SHIPMENT_STAGES, STAGE_PAPERS, stageIndex } from '../shipments/shipment-rules.js';

/** When a paper is needed: before a shipment stage, or once the export payment is in (BRC). */
export type NeededBy = 'IN_TRANSIT' | 'AT_BORDER' | 'CLEARED' | 'PAYMENT';

export interface InvoicePaperFacts {
  kind: InvoiceKind;
  /** The buyer's GST treatment (decides the IRN on a local invoice). */
  treatment: GstTreatment;
  /** Grand total, for the e-way bill limit. */
  total: number;
}

/** The stage each paper is first needed at, from the shipment rules. */
const STAGE_OF_PAPER = new Map<DispatchDocumentKind, ShipmentStage>(
  SHIPMENT_STAGES.flatMap((stage) => (STAGE_PAPERS[stage] ?? []).map((kind) => [kind, stage] as const)),
);

/**
 * The papers this invoice must have, each with when it is needed. An export
 * needs every paper a truck needs to clear customs (the e-way bill only above
 * the limit), then the BRC once paid. A local invoice needs its IRN when it is
 * B2B and an e-way bill above the limit, both before the goods move.
 */
export function requiredPapers(invoice: InvoicePaperFacts): { kind: DispatchDocumentKind; neededBy: NeededBy }[] {
  const ewayNeeded = invoice.total > EWAY_BILL_LIMIT;
  if (invoice.kind === 'EXPORT') {
    const papers = [...STAGE_OF_PAPER]
      .filter(([kind]) => kind !== 'EWAY_BILL' || ewayNeeded)
      .map(([kind, stage]) => ({ kind, neededBy: stage as NeededBy }));
    return [...papers, { kind: 'BRC', neededBy: 'PAYMENT' }];
  }
  const papers: { kind: DispatchDocumentKind; neededBy: NeededBy }[] = [];
  if (needsEinvoice(invoice.kind, invoice.treatment)) papers.push({ kind: 'E_INVOICE', neededBy: 'IN_TRANSIT' });
  if (ewayNeeded) papers.push({ kind: 'EWAY_BILL', neededBy: 'IN_TRANSIT' });
  return papers;
}

/**
 * Does a missing paper hold its truck back now? Yes when the shipment's next
 * stage (or an earlier one) needs it. The BRC never holds a truck.
 */
export function holdsTruck(neededBy: NeededBy, shipmentStage: ShipmentStage | null): boolean {
  if (!shipmentStage || neededBy === 'PAYMENT') return false;
  const next = nextStage(shipmentStage);
  return next !== null && stageIndex(neededBy) <= stageIndex(next);
}

export type PaperCell =
  | { kind: DispatchDocumentKind; state: 'ATTACHED'; number: string; date: string }
  | { kind: DispatchDocumentKind; state: 'MISSING'; neededBy: NeededBy; holdsTruck: boolean }
  /** Taken by this invoice but not required (a local challan, an e-way bill under the limit). */
  | { kind: DispatchDocumentKind; state: 'OPTIONAL' };

/** One cell per paper this invoice can take, in the order they happen. */
export function paperCells(
  invoice: InvoicePaperFacts,
  attached: { kind: DispatchDocumentKind; number: string; date: string }[],
  shipmentStage: ShipmentStage | null,
): PaperCell[] {
  const required = new Map(requiredPapers(invoice).map((paper) => [paper.kind, paper.neededBy]));
  const kinds = (Object.keys(DOCUMENT_RULES) as DispatchDocumentKind[]).filter((kind) => !documentKindProblem(kind, invoice.kind, invoice.treatment));
  return kinds.map((kind): PaperCell => {
    const doc = attached.find((candidate) => candidate.kind === kind);
    if (doc) return { kind, state: 'ATTACHED', number: doc.number, date: doc.date };
    const neededBy = required.get(kind);
    if (neededBy) return { kind, state: 'MISSING', neededBy, holdsTruck: holdsTruck(neededBy, shipmentStage) };
    return { kind, state: 'OPTIONAL' };
  });
}
