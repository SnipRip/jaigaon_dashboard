import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { dateOnly, isoDate, todayInIndia } from '../common/dates.js';
import { PrismaService } from '../database/prisma.service.js';
import type { DispatchDocumentKind, GstTreatment, InvoiceKind, InvoiceStatus, Prisma } from '../generated/prisma/client.js';
import { cleanDetails, cleanNumber, documentDateProblem, documentKindProblem, nameInText } from './dispatch-document-rules.js';
import type { InvoiceDocumentDto } from './dto/invoice.dto.js';
import { invoiceInclude, toInvoiceView, type InvoiceView } from './invoice-views.js';

type Tx = Prisma.TransactionClient;

/** IRNs and e-way bills belong to one invoice; the partial unique index in the migration backs this up. */
const ONE_INVOICE_KINDS: DispatchDocumentKind[] = ['E_INVOICE', 'EWAY_BILL'];

// The papers that follow an issued invoice (IRN, lorry hire challan, e-way
// bill, customs invoice, packing list, shipping bill, LEO, BRC). One per kind
// per invoice; saving again corrects it. Only while the invoice is issued: a
// cancelled invoice keeps its papers, read-only. The invoice row is locked so
// a cancel and an attach cannot cross.
@Injectable()
export class InvoiceDocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  save(invoiceId: string, kind: DispatchDocumentKind, dto: InvoiceDocumentDto, userId: string): Promise<InvoiceView> {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await this.lockIssued(tx, invoiceId);
      const kindProblem = documentKindProblem(kind, invoice.kind, invoice.treatment);
      if (kindProblem) throw new BadRequestException(kindProblem);

      const number = cleanNumber(kind, dto.number);
      if ('problem' in number) throw new BadRequestException(number.problem);
      const details = cleanDetails(kind, dto.details ?? {});
      if ('problem' in details) throw new BadRequestException(details.problem);
      const dateProblem = documentDateProblem({ date: dto.date, details: details.details }, isoDate(invoice.date), todayInIndia());
      if (dateProblem) throw new BadRequestException(dateProblem);

      if (ONE_INVOICE_KINDS.includes(kind)) {
        const other = await tx.invoiceDocument.findFirst({
          where: { kind, number: number.number, invoiceId: { not: invoiceId } },
          select: { invoice: { select: { number: true } } },
        });
        if (other) throw new ConflictException(`This ${nameInText(kind)} is already on invoice ${other.invoice.number}`);
      }

      const data = { number: number.number, date: dateOnly(dto.date), details: details.details, savedById: userId };
      await tx.invoiceDocument.upsert({
        where: { invoiceId_kind: { invoiceId, kind } },
        create: { invoiceId, kind, ...data },
        update: data,
      });
      return this.view(tx, invoiceId);
    });
  }

  remove(invoiceId: string, kind: DispatchDocumentKind): Promise<InvoiceView> {
    return this.prisma.$transaction(async (tx) => {
      await this.lockIssued(tx, invoiceId);
      const { count } = await tx.invoiceDocument.deleteMany({ where: { invoiceId, kind } });
      if (count === 0) throw new NotFoundException(`No ${nameInText(kind)} is attached`);
      return this.view(tx, invoiceId);
    });
  }

  private async lockIssued(tx: Tx, invoiceId: string) {
    const [invoice] = await tx.$queryRaw<{ kind: InvoiceKind; status: InvoiceStatus; date: Date; treatment: GstTreatment }[]>`
      SELECT i."kind", i."status", i."date", p."treatment"
      FROM "Invoice" i JOIN "Party" p ON p."id" = i."partyId"
      WHERE i."id" = ${invoiceId}::uuid FOR UPDATE OF i`;
    if (!invoice) throw new NotFoundException('That invoice does not exist');
    if (invoice.status !== 'ISSUED') throw new ConflictException('This invoice is cancelled; its documents can no longer change');
    return invoice;
  }

  private async view(tx: Tx, invoiceId: string) {
    return toInvoiceView(await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId }, include: invoiceInclude }));
  }
}
