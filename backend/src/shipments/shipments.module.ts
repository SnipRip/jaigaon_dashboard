import { Module } from '@nestjs/common';
import { NumberSeriesModule } from '../number-series/number-series.module.js';
import { ShipmentsController } from './shipments.controller.js';
import { ShipmentsService } from './shipments.service.js';

// Trucks to Bhutan: one buyer's export invoices, stages gated by the papers
// on those invoices (shipment-rules.ts), expenses linked and profit.
@Module({
  imports: [NumberSeriesModule],
  controllers: [ShipmentsController],
  providers: [ShipmentsService],
})
export class ShipmentsModule {}
