import { Module } from '@nestjs/common';
import { LineRateOptionsController } from './line-rate-options.controller.js';
import { LineRateOptionsService } from './line-rate-options.service.js';
import { SpecialRatesController } from './special-rates.controller.js';
import { SpecialRatesService } from './special-rates.service.js';

// Customer special rates (masters-plan.md, section E) and the line rate
// options a quotation or invoice line offers.
@Module({
  controllers: [SpecialRatesController, LineRateOptionsController],
  providers: [SpecialRatesService, LineRateOptionsService],
  // The importer (src/imports) saves rows through it.
  exports: [SpecialRatesService],
})
export class PricingModule {}
