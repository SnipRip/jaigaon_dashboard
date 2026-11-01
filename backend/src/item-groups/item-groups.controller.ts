import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ListQueryDto } from '../common/dto/field-validators.js';
import { RequireAccess } from '../common/decorators/require-access.decorator.js';
import { ITEMS_MODULE } from '../items/items-module-key.js';
import { CreateItemGroupDto } from './dto/create-item-group.dto.js';
import { UpdateItemGroupDto } from './dto/update-item-group.dto.js';
import type { ItemGroupView } from './item-group-view.js';
import { ItemGroupsService } from './item-groups.service.js';

@Controller('item-groups')
export class ItemGroupsController {
  constructor(private readonly groups: ItemGroupsService) {}

  @Get()
  list(@Query() query: ListQueryDto): Promise<ItemGroupView[]> {
    return this.groups.list(query.includeArchived);
  }

  @RequireAccess(ITEMS_MODULE, 'create')
  @Post()
  create(@Body() dto: CreateItemGroupDto): Promise<ItemGroupView> {
    return this.groups.create(dto);
  }

  @RequireAccess(ITEMS_MODULE, 'edit')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateItemGroupDto,
  ): Promise<ItemGroupView> {
    return this.groups.update(id, dto);
  }

  // Only an empty group can be deleted; one with variants is archived.
  @RequireAccess(ITEMS_MODULE, 'delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.groups.remove(id);
  }
}
