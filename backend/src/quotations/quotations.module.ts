import { Module } from '@nestjs/common';
import { NumberSeriesModule } from '../number-series/number-series.module.js';
import { PricingModule } from '../pricing/pricing.module.js';
import { SchemesModule } from '../schemes/schemes.module.js';
import { QuotationsController } from './quotations.controller.js';
import { QuotationsService } from './quotations.service.js';

// Quotations, priced on the server: line rate options (pricing), schemes and GST.
@Module({
  imports: [NumberSeriesModule, PricingModule, SchemesModule],
  controllers: [QuotationsController],
  providers: [QuotationsService],
})
export class QuotationsModule {}
