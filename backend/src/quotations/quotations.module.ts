import { Module } from '@nestjs/common';
import { NumberSeriesModule } from '../number-series/number-series.module.js';
import { SalePricingModule } from '../sale-pricing/sale-pricing.module.js';
import { QuotationsController } from './quotations.controller.js';
import { QuotationsService } from './quotations.service.js';

// Quotations, priced on the server (sale-pricing: rate options, schemes, GST).
@Module({
  imports: [NumberSeriesModule, SalePricingModule],
  controllers: [QuotationsController],
  providers: [QuotationsService],
})
export class QuotationsModule {}
