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
import { CurrentAuth } from '../common/decorators/current-auth.decorator.js';
import { RequireAccess } from '../common/decorators/require-access.decorator.js';
import type { AuthContext } from '../common/types/authenticated-request.js';
import { BulkItemPricesDto } from './dto/bulk-item-prices.dto.js';
import { CopyItemPricesDto } from './dto/copy-item-prices.dto.js';
import { CreateItemPriceDto } from './dto/create-item-price.dto.js';
import { ListItemPricesQueryDto } from './dto/list-item-prices-query.dto.js';
import { PriceSheetQueryDto } from './dto/price-sheet-query.dto.js';
import { UpdateItemPriceDto } from './dto/update-item-price.dto.js';
import { PRICE_LIST_MODULE } from './price-list-module-key.js';
import type { ItemPriceView, PriceSheetView } from './price-list-views.js';
import { PriceListService } from './price-list.service.js';

// The day-wise price list. Every route needs the Price list permission,
// reading too: the day's prices and costs are not for every account.
@Controller('price-list')
export class PriceListController {
  constructor(private readonly prices: PriceListService) {}

  @RequireAccess(PRICE_LIST_MODULE, 'view')
  @Get('sheet')
  sheet(@Query() query: PriceSheetQueryDto): Promise<PriceSheetView> {
    return this.prices.sheet(query);
  }

  @RequireAccess(PRICE_LIST_MODULE, 'view')
  @Get()
  list(@Query() query: ListItemPricesQueryDto): Promise<ItemPriceView[]> {
    return this.prices.list(query);
  }

  @RequireAccess(PRICE_LIST_MODULE, 'create')
  @Post()
  create(
    @Body() dto: CreateItemPriceDto,
    @CurrentAuth() auth: AuthContext,
  ): Promise<ItemPriceView> {
    return this.prices.create(dto, auth.userId);
  }

  @RequireAccess(PRICE_LIST_MODULE, 'create')
  @Post('bulk')
  bulk(
    @Body() dto: BulkItemPricesDto,
    @CurrentAuth() auth: AuthContext,
  ): Promise<{ saved: number }> {
    return this.prices.bulk(dto, auth.userId);
  }

  @RequireAccess(PRICE_LIST_MODULE, 'create')
  @Post('copy')
  copy(
    @Body() dto: CopyItemPricesDto,
    @CurrentAuth() auth: AuthContext,
  ): Promise<{ saved: number }> {
    return this.prices.copy(dto, auth.userId);
  }

  @RequireAccess(PRICE_LIST_MODULE, 'edit')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateItemPriceDto,
    @CurrentAuth() auth: AuthContext,
  ): Promise<ItemPriceView> {
    return this.prices.update(id, dto, auth.userId);
  }

  @RequireAccess(PRICE_LIST_MODULE, 'delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.prices.remove(id);
  }
}
