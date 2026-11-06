import { Injectable } from '@nestjs/common';
import { isoDate } from '../common/dates.js';
import { toNumber } from '../common/decimal.js';
import { PrismaService } from '../database/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { holdsTruck, paperCells, requiredPapers } from './document-register-rules.js';
import type { DocumentRegisterView, MissingPaperView, RegisterEntryView, ShipmentPapersView, ShipmentRef } from './document-register-views.js';

/** The shipment an invoice rides on: a link not released by a cancel (live or delivered). */
const carryingShipment = {
  where: { released: false },
  take: 1,
  select: { shipment: { select: { id: true, number: true, stage: true, vehicleNumber: true } } },
} as const satisfies Prisma.Invoice$shipmentsArgs;

const shipmentRef = (links: { shipment: ShipmentRef }[]): ShipmentRef | null => {
  const shipment = links[0]?.shipment;
  return shipment ? { id: shipment.id, number: shipment.number, stage: shipment.stage } : null;
};

const byDateDesc = (a: { date: string }, b: { date: string }) => b.date.localeCompare(a.date);

// Read-only: the register is built from the records the papers belong to
// (invoice dispatch documents, vendor bills, shipments), so there is no second
// copy to keep in step. Papers are attached or corrected on the invoice page.
@Injectable()
export class DocumentRegisterService {
  constructor(private readonly prisma: PrismaService) {}

  async register(): Promise<DocumentRegisterView> {
    const [documents, bills, open, shipments] = await Promise.all([
      this.prisma.invoiceDocument.findMany({
        select: {
          kind: true,
          number: true,
          date: true,
          details: true,
          invoice: {
            select: { id: true, number: true, status: true, vehicleNumber: true, party: { select: { displayName: true } }, shipments: carryingShipment },
          },
        },
      }),
      this.prisma.purchaseBill.findMany({
        select: {
          id: true,
          reference: true,
          vendorBillNumber: true,
          date: true,
          ewayBillNumber: true,
          ewayBillDate: true,
          vehicleNumber: true,
          status: true,
          vendor: { select: { displayName: true } },
        },
      }),
      // Issued invoices: the papers they still need.
      this.prisma.invoice.findMany({
        where: { status: 'ISSUED' },
        orderBy: [{ date: 'asc' }, { number: 'asc' }],
        select: {
          id: true,
          number: true,
          date: true,
          kind: true,
          total: true,
          party: { select: { displayName: true, treatment: true } },
          documents: { select: { kind: true } },
          shipments: carryingShipment,
        },
      }),
      this.prisma.shipment.findMany({
        where: { cancelledAt: null },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          number: true,
          date: true,
          stage: true,
          vehicleNumber: true,
          party: { select: { displayName: true, treatment: true } },
          invoices: {
            orderBy: { invoice: { number: 'asc' } },
            select: {
              invoice: {
                select: { id: true, number: true, kind: true, status: true, total: true, documents: { select: { kind: true, number: true, date: true } } },
              },
            },
          },
        },
      }),
    ]);

    const fromInvoices = documents.map(({ invoice, ...doc }): RegisterEntryView => {
      const details = doc.details as Record<string, unknown>;
      const shipment = invoice.shipments[0]?.shipment;
      return {
        kind: doc.kind,
        number: doc.number,
        date: isoDate(doc.date),
        owner: { type: 'INVOICE', id: invoice.id, number: invoice.number },
        partyName: invoice.party.displayName,
        vehicle: (typeof details.vehicle === 'string' ? details.vehicle : null) ?? invoice.vehicleNumber ?? shipment?.vehicleNumber ?? null,
        shipment: shipmentRef(invoice.shipments),
        cancelled: invoice.status === 'CANCELLED',
      };
    });

    const fromBills = bills.flatMap((bill): RegisterEntryView[] => {
      const base = {
        owner: { type: 'BILL' as const, id: bill.id, number: bill.reference },
        partyName: bill.vendor.displayName,
        shipment: null,
        cancelled: bill.status === 'VOID',
      };
      const entries: RegisterEntryView[] = [{ ...base, kind: 'VENDOR_BILL', number: bill.vendorBillNumber, date: isoDate(bill.date), vehicle: null }];
      if (bill.ewayBillNumber) {
        entries.push({
          ...base,
          kind: 'PURCHASE_EWAY_BILL',
          number: bill.ewayBillNumber,
          date: isoDate(bill.ewayBillDate ?? bill.date),
          vehicle: bill.vehicleNumber,
        });
      }
      return entries;
    });

    const missing = open.flatMap((invoice): MissingPaperView[] => {
      const attached = new Set(invoice.documents.map((doc) => doc.kind));
      const shipment = shipmentRef(invoice.shipments);
      return requiredPapers({ kind: invoice.kind, treatment: invoice.party.treatment, total: toNumber(invoice.total) })
        .filter((paper) => !attached.has(paper.kind))
        .map((paper) => ({
          kind: paper.kind,
          neededBy: paper.neededBy,
          holdsTruck: holdsTruck(paper.neededBy, shipment?.stage ?? null),
          invoice: { id: invoice.id, number: invoice.number, date: isoDate(invoice.date), kind: invoice.kind },
          partyName: invoice.party.displayName,
          shipment,
        }));
    });

    const papers = shipments.map(
      (shipment): ShipmentPapersView => ({
        id: shipment.id,
        number: shipment.number,
        date: isoDate(shipment.date),
        stage: shipment.stage,
        partyName: shipment.party.displayName,
        vehicleNumber: shipment.vehicleNumber,
        invoices: shipment.invoices.map(({ invoice }) => ({
          id: invoice.id,
          number: invoice.number,
          status: invoice.status,
          papers: paperCells(
            { kind: invoice.kind, treatment: shipment.party.treatment, total: toNumber(invoice.total) },
            invoice.documents.map((doc) => ({ kind: doc.kind, number: doc.number, date: isoDate(doc.date) })),
            shipment.stage,
          ),
        })),
      }),
    );

    return { entries: [...fromInvoices, ...fromBills].sort(byDateDesc), missing, shipments: papers };
  }
}
