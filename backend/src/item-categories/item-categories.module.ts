import { Module } from '@nestjs/common';
import { ItemCategoriesController } from './item-categories.controller.js';
import { ItemCategoriesService } from './item-categories.service.js';

@Module({
  controllers: [ItemCategoriesController],
  providers: [ItemCategoriesService],
})
export class ItemCategoriesModule {}
