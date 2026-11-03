import { Module } from '@nestjs/common';
import { AccountHeadsController } from './account-heads.controller.js';
import { AccountHeadsService } from './account-heads.service.js';

@Module({
  controllers: [AccountHeadsController],
  providers: [AccountHeadsService],
  // The importer (src/imports) saves rows through it.
  exports: [AccountHeadsService],
})
export class AccountHeadsModule {}
