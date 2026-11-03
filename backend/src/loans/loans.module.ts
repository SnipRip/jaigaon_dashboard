import { Module } from '@nestjs/common';
import { NumberSeriesModule } from '../number-series/number-series.module.js';
import { LoansController } from './loans.controller.js';
import { LoansService } from './loans.service.js';

@Module({
  imports: [NumberSeriesModule],
  controllers: [LoansController],
  providers: [LoansService],
  // The importer (src/imports) saves rows through it.
  exports: [LoansService],
})
export class LoansModule {}
