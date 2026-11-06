import { Module } from '@nestjs/common';
import { NumberSeriesModule } from '../number-series/number-series.module.js';
import { SalePricingModule } from '../sale-pricing/sale-pricing.module.js';
import { InvoiceDocumentsService } from './invoice-documents.service.js';
import { InvoicesController } from './invoices.controller.js';
import { InvoicesService } from './invoices.service.js';

// Sales invoices: priced like quotations (sale-pricing), numbered from the
// SALES_INVOICE / EXPORT_INVOICE series, stock drawn FIFO (src/stock); the
// dispatch documents that follow them (invoice-documents.service.ts).
@Module({
  imports: [NumberSeriesModule, SalePricingModule],
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoiceDocumentsService],
})
export class InvoicesModule {}
