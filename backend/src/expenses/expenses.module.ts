import { Module } from '@nestjs/common';
import { NumberSeriesModule } from '../number-series/number-series.module.js';
import { ExpensesController } from './expenses.controller.js';
import { ExpensesService } from './expenses.service.js';

// Expenses paid from bank / cash or owed to a vendor, under an expense head,
// allocated to a purchase's items, an invoice, a shipment or overhead
// (expense-rules.ts); posted by books/expense-postings.ts.
@Module({
  imports: [NumberSeriesModule],
  controllers: [ExpensesController],
  providers: [ExpensesService],
})
export class ExpensesModule {}
