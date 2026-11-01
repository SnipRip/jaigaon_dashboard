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
import { CreateItemCategoryDto } from './dto/create-item-category.dto.js';
import { UpdateItemCategoryDto } from './dto/update-item-category.dto.js';
import { ItemCategoriesService } from './item-categories.service.js';
import type { CategoryView, SubCategoryView } from './item-category-view.js';

// GET returns the two-level tree. Reading is open to every signed-in user.
@Controller('item-categories')
export class ItemCategoriesController {
  constructor(private readonly categories: ItemCategoriesService) {}

  @Get()
  tree(@Query() query: ListQueryDto): Promise<CategoryView[]> {
    return this.categories.tree(query.includeArchived);
  }

  @RequireAccess(ITEMS_MODULE, 'create')
  @Post()
  create(@Body() dto: CreateItemCategoryDto): Promise<SubCategoryView> {
    return this.categories.create(dto);
  }

  @RequireAccess(ITEMS_MODULE, 'edit')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateItemCategoryDto,
  ): Promise<SubCategoryView> {
    return this.categories.update(id, dto);
  }

  @RequireAccess(ITEMS_MODULE, 'delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.categories.remove(id);
  }
}
