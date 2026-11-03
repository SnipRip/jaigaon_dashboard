import { Module } from '@nestjs/common';
import { LedgerGroupsController, LedgersController } from './ledgers.controller.js';
import { LedgerGroupsService } from './ledger-groups.service.js';
import { LedgersService } from './ledgers.service.js';

@Module({
  controllers: [LedgerGroupsController, LedgersController],
  providers: [LedgerGroupsService, LedgersService],
  // The importer (src/imports) saves rows through it.
  exports: [LedgersService],
})
export class LedgersModule {}
