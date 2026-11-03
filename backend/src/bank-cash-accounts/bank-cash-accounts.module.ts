import { Module } from '@nestjs/common';
import { BankCashAccountsController } from './bank-cash-accounts.controller.js';
import { BankCashAccountsService } from './bank-cash-accounts.service.js';

@Module({
  controllers: [BankCashAccountsController],
  providers: [BankCashAccountsService],
})
export class BankCashAccountsModule {}
