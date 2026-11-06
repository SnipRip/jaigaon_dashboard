import { Module } from '@nestjs/common';
import { SettlementsModule } from '../settlements/settlements.module.js';
import { LineRateOptionsController } from './line-rate-options.controller.js';
import { LineRateOptionsService } from './line-rate-options.service.js';
import { RateEnquiryController } from './rate-enquiry.controller.js';
import { RateEnquiryService } from './rate-enquiry.service.js';
import { SpecialRatesController } from './special-rates.controller.js';
import { SpecialRatesService } from './special-rates.service.js';

// Customer special rates (masters-plan.md, section E), the line rate
// options a quotation or invoice line offers, and the rate enquiry built on them.
@Module({
  imports: [SettlementsModule],
  controllers: [SpecialRatesController, LineRateOptionsController, RateEnquiryController],
  providers: [SpecialRatesService, LineRateOptionsService, RateEnquiryService],
  // The importer (src/imports) saves rows through it.
  exports: [SpecialRatesService, LineRateOptionsService],
})
export class PricingModule {}
