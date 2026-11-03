import { Module } from '@nestjs/common';
import { BankCashAccountsController } from './bank-cash-accounts.controller.js';
import { BankCashAccountsService } from './bank-cash-accounts.service.js';

@Module({
  controllers: [BankCashAccountsController],
  providers: [BankCashAccountsService],
  // The importer (src/imports) saves rows through it.
  exports: [BankCashAccountsService],
})
export class BankCashAccountsModule {}
