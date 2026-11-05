import { Module } from '@nestjs/common';
import { PricingModule } from '../pricing/pricing.module.js';
import { SchemesModule } from '../schemes/schemes.module.js';
import { SalePricingService } from './sale-pricing.service.js';

// Server pricing shared by quotations and invoices: line rate options
// (pricing), schemes and GST.
@Module({
  imports: [PricingModule, SchemesModule],
  providers: [SalePricingService],
  exports: [SalePricingService],
})
export class SalePricingModule {}
