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
import { RequireAccess } from '../common/decorators/require-access.decorator.js';
import { ListQueryDto } from '../common/dto/field-validators.js';
import { CreateQuantitySlabDto } from './dto/create-quantity-slab.dto.js';
import { UpdateQuantitySlabDto } from './dto/update-quantity-slab.dto.js';
import { QuantitySlabsService } from './quantity-slabs.service.js';
import { RATES_MODULE } from './pricing-module-key.js';
import type { QuantitySlabView } from './pricing-views.js';

// Quantity slabs. Reading is open to every signed-in user; changes need the
// Rates permission.
@Controller('quantity-slabs')
export class QuantitySlabsController {
  constructor(private readonly slabs: QuantitySlabsService) {}

  @Get()
  list(@Query() query: ListQueryDto): Promise<QuantitySlabView[]> {
    return this.slabs.list(query.includeArchived);
  }

  @RequireAccess(RATES_MODULE, 'create')
  @Post()
  create(@Body() dto: CreateQuantitySlabDto): Promise<QuantitySlabView> {
    return this.slabs.create(dto);
  }

  @RequireAccess(RATES_MODULE, 'edit')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQuantitySlabDto,
  ): Promise<QuantitySlabView> {
    return this.slabs.update(id, dto);
  }

  @RequireAccess(RATES_MODULE, 'delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.slabs.remove(id);
  }
}
