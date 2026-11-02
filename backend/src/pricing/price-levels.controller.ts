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
import { CreatePriceLevelDto } from './dto/create-price-level.dto.js';
import { UpdatePriceLevelDto } from './dto/update-price-level.dto.js';
import { PriceLevelsService } from './price-levels.service.js';
import { RATES_MODULE } from './pricing-module-key.js';
import type { PriceLevelView } from './pricing-views.js';

// Reading is open to every signed-in user: the customer form picks a level
// and documents price from it. Changes need the Rates permission.
@Controller('price-levels')
export class PriceLevelsController {
  constructor(private readonly levels: PriceLevelsService) {}

  @Get()
  list(@Query() query: ListQueryDto): Promise<PriceLevelView[]> {
    return this.levels.list(query.includeArchived);
  }

  @RequireAccess(RATES_MODULE, 'create')
  @Post()
  create(@Body() dto: CreatePriceLevelDto): Promise<PriceLevelView> {
    return this.levels.create(dto);
  }

  @RequireAccess(RATES_MODULE, 'edit')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePriceLevelDto,
  ): Promise<PriceLevelView> {
    return this.levels.update(id, dto);
  }

  @RequireAccess(RATES_MODULE, 'delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.levels.remove(id);
  }
}
