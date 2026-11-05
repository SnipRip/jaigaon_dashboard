import { Module } from '@nestjs/common';
import { NumberSeriesModule } from '../number-series/number-series.module.js';
import { SalePricingModule } from '../sale-pricing/sale-pricing.module.js';
import { InvoicesController } from './invoices.controller.js';
import { InvoicesService } from './invoices.service.js';

// Sales invoices: priced like quotations (sale-pricing), numbered from the
// SALES_INVOICE / EXPORT_INVOICE series, stock drawn FIFO (src/stock).
@Module({
  imports: [NumberSeriesModule, SalePricingModule],
  controllers: [InvoicesController],
  providers: [InvoicesService],
})
export class InvoicesModule {}
