import { Module } from '@nestjs/common';
import { PriceListController } from './price-list.controller.js';
import { PriceListService } from './price-list.service.js';

// Day-wise item prices (agent/price-list-plan.md).
@Module({
  controllers: [PriceListController],
  providers: [PriceListService],
  // The importer (src/imports) saves rows through it.
  exports: [PriceListService],
})
export class PriceListModule {}
