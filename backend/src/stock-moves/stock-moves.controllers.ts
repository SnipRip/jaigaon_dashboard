import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CurrentAuth } from '../common/decorators/current-auth.decorator.js';
import { RequireAccess } from '../common/decorators/require-access.decorator.js';
import type { AuthContext } from '../common/types/authenticated-request.js';
import { CancelStockMoveDto, StockAdjustmentDto, StockTransferDto } from './dto/stock-move.dto.js';
import { StockAdjustmentsService } from './stock-adjustments.service.js';
import type { StockAdjustmentView, StockTransferView } from './stock-move-views.js';
import { StockTransfersService } from './stock-transfers.service.js';

/** The screens' permission keys (frontend config/navigation.ts). */
export const TRANSFERS_MODULE = '/stock-transfers';
export const ADJUSTMENTS_MODULE = '/stock-adjustments';

@Controller('stock-transfers')
export class StockTransfersController {
  constructor(private readonly transfers: StockTransfersService) {}

  @RequireAccess(TRANSFERS_MODULE, 'view')
  @Get()
  list(): Promise<StockTransferView[]> {
    return this.transfers.list();
  }

  @RequireAccess(TRANSFERS_MODULE, 'view')
  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string): Promise<StockTransferView> {
    return this.transfers.get(id);
  }

  @RequireAccess(TRANSFERS_MODULE, 'create')
  @Post()
  create(@Body() dto: StockTransferDto, @CurrentAuth() auth: AuthContext): Promise<StockTransferView> {
    return this.transfers.create(dto, auth.userId);
  }

  @RequireAccess(TRANSFERS_MODULE, 'edit')
  @HttpCode(HttpStatus.OK)
  @Post(':id/cancel')
  cancel(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CancelStockMoveDto): Promise<StockTransferView> {
    return this.transfers.cancel(id, dto.reason);
  }
}

@Controller('stock-adjustments')
export class StockAdjustmentsController {
  constructor(private readonly adjustments: StockAdjustmentsService) {}

  @RequireAccess(ADJUSTMENTS_MODULE, 'view')
  @Get()
  list(): Promise<StockAdjustmentView[]> {
    return this.adjustments.list();
  }

  @RequireAccess(ADJUSTMENTS_MODULE, 'view')
  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string): Promise<StockAdjustmentView> {
    return this.adjustments.get(id);
  }

  @RequireAccess(ADJUSTMENTS_MODULE, 'create')
  @Post()
  create(@Body() dto: StockAdjustmentDto, @CurrentAuth() auth: AuthContext): Promise<StockAdjustmentView> {
    return this.adjustments.create(dto, auth.userId);
  }

  @RequireAccess(ADJUSTMENTS_MODULE, 'edit')
  @HttpCode(HttpStatus.OK)
  @Post(':id/cancel')
  cancel(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CancelStockMoveDto): Promise<StockAdjustmentView> {
    return this.adjustments.cancel(id, dto.reason);
  }
}
