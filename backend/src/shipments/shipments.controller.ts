import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { CurrentAuth } from '../common/decorators/current-auth.decorator.js';
import { RequireAccess } from '../common/decorators/require-access.decorator.js';
import type { AuthContext } from '../common/types/authenticated-request.js';
import { CancelShipmentDto, LinkExpensesDto, ShipmentDto, ShipmentQueryDto, ShipmentStageDto } from './dto/shipment.dto.js';
import type { ShipmentView } from './shipment-views.js';
import { ShipmentsService } from './shipments.service.js';

/** The Shipments screen's permission key (frontend config/navigation.ts). */
export const SHIPMENTS_MODULE = '/shipments';

@Controller('shipments')
export class ShipmentsController {
  constructor(private readonly shipments: ShipmentsService) {}

  @RequireAccess(SHIPMENTS_MODULE, 'view')
  @Get()
  list(@Query() query: ShipmentQueryDto): Promise<ShipmentView[]> {
    return this.shipments.list(query);
  }

  @RequireAccess(SHIPMENTS_MODULE, 'view')
  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string): Promise<ShipmentView> {
    return this.shipments.get(id);
  }

  @RequireAccess(SHIPMENTS_MODULE, 'create')
  @Post()
  create(@Body() dto: ShipmentDto, @CurrentAuth() auth: AuthContext): Promise<ShipmentView> {
    return this.shipments.create(dto, auth.userId);
  }

  @RequireAccess(SHIPMENTS_MODULE, 'edit')
  @Put(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ShipmentDto): Promise<ShipmentView> {
    return this.shipments.update(id, dto);
  }

  @RequireAccess(SHIPMENTS_MODULE, 'edit')
  @HttpCode(HttpStatus.OK)
  @Post(':id/stage')
  advance(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ShipmentStageDto, @CurrentAuth() auth: AuthContext): Promise<ShipmentView> {
    return this.shipments.advance(id, dto, auth.userId);
  }

  @RequireAccess(SHIPMENTS_MODULE, 'edit')
  @HttpCode(HttpStatus.OK)
  @Post(':id/stage/back')
  stepBack(@Param('id', ParseUUIDPipe) id: string): Promise<ShipmentView> {
    return this.shipments.stepBack(id);
  }

  @RequireAccess(SHIPMENTS_MODULE, 'edit')
  @HttpCode(HttpStatus.OK)
  @Post(':id/cancel')
  cancel(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CancelShipmentDto): Promise<ShipmentView> {
    return this.shipments.cancel(id, dto.reason);
  }

  @RequireAccess(SHIPMENTS_MODULE, 'edit')
  @HttpCode(HttpStatus.OK)
  @Post(':id/expenses')
  linkExpenses(@Param('id', ParseUUIDPipe) id: string, @Body() dto: LinkExpensesDto): Promise<ShipmentView> {
    return this.shipments.linkExpenses(id, dto);
  }

  @RequireAccess(SHIPMENTS_MODULE, 'edit')
  @Delete(':id/expenses/:expenseId')
  unlinkExpense(@Param('id', ParseUUIDPipe) id: string, @Param('expenseId', ParseUUIDPipe) expenseId: string): Promise<ShipmentView> {
    return this.shipments.unlinkExpense(id, expenseId);
  }
}
