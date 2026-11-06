import { Module } from '@nestjs/common';
import { NumberSeriesModule } from '../number-series/number-series.module.js';
import { SettlementsController } from './settlements.controller.js';
import { SettlementsService } from './settlements.service.js';

// Receipts from customers and payments to vendors, applied to invoices,
// bills and opening balances; outstanding and ageing (settlement-rules.ts).
@Module({
  imports: [NumberSeriesModule],
  controllers: [SettlementsController],
  providers: [SettlementsService],
})
export class SettlementsModule {}
