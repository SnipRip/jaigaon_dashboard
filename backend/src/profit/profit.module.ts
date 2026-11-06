import { Module } from '@nestjs/common';
import { ProfitController } from './profit.controller.js';
import { ProfitService } from './profit.service.js';

// Actual profit (SOW 14, 15): by invoice, shipment, customer and item, with
// overheads off for net profit. Read-only.
@Module({
  controllers: [ProfitController],
  providers: [ProfitService],
})
export class ProfitModule {}
