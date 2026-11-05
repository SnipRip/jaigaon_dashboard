import { Module } from '@nestjs/common';
import { NumberSeriesModule } from '../number-series/number-series.module.js';
import { PurchaseBillsService } from './purchase-bills.service.js';
import { PurchaseOrdersService } from './purchase-orders.service.js';
import { PurchaseBillsController, PurchaseOrdersController } from './purchases.controllers.js';

// Purchase orders and vendor bills; goods bills bring stock in (StockBatch).
@Module({
  imports: [NumberSeriesModule],
  controllers: [PurchaseOrdersController, PurchaseBillsController],
  providers: [PurchaseOrdersService, PurchaseBillsService],
})
export class PurchasesModule {}
