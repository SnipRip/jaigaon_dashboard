import { Module } from '@nestjs/common';
import { NumberSeriesModule } from '../number-series/number-series.module.js';
import { StockAdjustmentsService } from './stock-adjustments.service.js';
import { StockAdjustmentsController, StockTransfersController } from './stock-moves.controllers.js';
import { StockTransfersService } from './stock-transfers.service.js';

// Stock transfers between godowns (STOCK_TRANSFER series) and stock
// adjustments (STOCK_JOURNAL series); both draw FIFO through src/stock.
@Module({
  imports: [NumberSeriesModule],
  controllers: [StockTransfersController, StockAdjustmentsController],
  providers: [StockTransfersService, StockAdjustmentsService],
})
export class StockMovesModule {}
