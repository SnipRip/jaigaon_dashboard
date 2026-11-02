import { Module } from '@nestjs/common';
import { PriceLevelsController } from './price-levels.controller.js';
import { PriceLevelsService } from './price-levels.service.js';
import { QuantitySlabsController } from './quantity-slabs.controller.js';
import { QuantitySlabsService } from './quantity-slabs.service.js';
import { RateQuoteController } from './rate-quote.controller.js';
import { RateQuoteService } from './rate-quote.service.js';
import { SpecialRatesController } from './special-rates.controller.js';
import { SpecialRatesService } from './special-rates.service.js';

// Pricing masters (masters-plan.md, section E) and the rate quote.
@Module({
  controllers: [
    PriceLevelsController,
    SpecialRatesController,
    QuantitySlabsController,
    RateQuoteController,
  ],
  providers: [
    PriceLevelsService,
    SpecialRatesService,
    QuantitySlabsService,
    RateQuoteService,
  ],
})
export class PricingModule {}
