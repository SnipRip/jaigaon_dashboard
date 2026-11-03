import { Module } from '@nestjs/common';
import { NumberSeriesController } from './number-series.controller.js';
import { NumberSeriesService } from './number-series.service.js';

// Exports the service: quotations, invoices, bills and the rest import this
// module and call issue (and cancel) inside their own save transaction.
@Module({
  controllers: [NumberSeriesController],
  providers: [NumberSeriesService],
  exports: [NumberSeriesService],
})
export class NumberSeriesModule {}
