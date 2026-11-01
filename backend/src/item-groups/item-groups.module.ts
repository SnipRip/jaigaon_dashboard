import { Module } from '@nestjs/common';
import { ItemGroupsController } from './item-groups.controller.js';
import { ItemGroupsService } from './item-groups.service.js';

@Module({
  controllers: [ItemGroupsController],
  providers: [ItemGroupsService],
})
export class ItemGroupsModule {}
