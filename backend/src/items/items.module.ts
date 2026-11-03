import { Module } from '@nestjs/common';
import { ItemsController } from './items.controller.js';
import { ItemsService } from './items.service.js';

@Module({
  controllers: [ItemsController],
  providers: [ItemsService],
  // The importer (src/imports) saves rows through it.
  exports: [ItemsService],
})
export class ItemsModule {}
