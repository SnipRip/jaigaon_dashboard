import { Module } from '@nestjs/common';
import { SchemesController } from './schemes.controller.js';
import { SchemesService } from './schemes.service.js';

// Schemes and discounts for customers (sales only). Quotations and invoices
// call SchemesService.forDocument inside their save transaction.
@Module({
  controllers: [SchemesController],
  providers: [SchemesService],
  exports: [SchemesService],
})
export class SchemesModule {}
