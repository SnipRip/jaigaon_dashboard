import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { IsOptional, IsUUID } from 'class-validator';
import { CurrentAuth } from '../common/decorators/current-auth.decorator.js';
import { RequireAccess } from '../common/decorators/require-access.decorator.js';
import type { AuthContext } from '../common/types/authenticated-request.js';
import { BillAllocationDto, CreatePurchaseBillDto, LastPurchaseRatesQueryDto, ListPurchaseBillsQueryDto } from './dto/purchase-bill.dto.js';
import { PurchaseOrderDto } from './dto/purchase-order.dto.js';
import { PurchaseBillsService } from './purchase-bills.service.js';
import { PurchaseOrdersService } from './purchase-orders.service.js';
import type { PurchaseBillView, PurchaseOrderView } from './purchase-views.js';

// Permission keys: the sidebar hrefs (frontend config/navigation.ts).
export const PURCHASE_BILLS_MODULE = '/purchases';
export const PURCHASE_ORDERS_MODULE = '/purchase-orders';

class VendorQueryDto {
  @IsOptional()
  @IsUUID()
  vendorId?: string;
}

// Purchase orders. Every route needs the Purchase orders permission: costs
// and vendors are not for every account.
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly orders: PurchaseOrdersService) {}

  @RequireAccess(PURCHASE_ORDERS_MODULE, 'view')
  @Get()
  list(@Query() query: VendorQueryDto): Promise<PurchaseOrderView[]> {
    return this.orders.list(query.vendorId);
  }

  @RequireAccess(PURCHASE_ORDERS_MODULE, 'view')
  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string): Promise<PurchaseOrderView> {
    return this.orders.get(id);
  }

  @RequireAccess(PURCHASE_ORDERS_MODULE, 'create')
  @Post()
  create(@Body() dto: PurchaseOrderDto, @CurrentAuth() auth: AuthContext): Promise<PurchaseOrderView> {
    return this.orders.create(dto, auth.userId);
  }

  /** Replaces the order as a whole, while nothing has been received against it. */
  @RequireAccess(PURCHASE_ORDERS_MODULE, 'edit')
  @Put(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: PurchaseOrderDto): Promise<PurchaseOrderView> {
    return this.orders.update(id, dto);
  }

  @RequireAccess(PURCHASE_ORDERS_MODULE, 'edit')
  @HttpCode(HttpStatus.OK)
  @Post(':id/close')
  close(@Param('id', ParseUUIDPipe) id: string): Promise<PurchaseOrderView> {
    return this.orders.close(id);
  }

  @RequireAccess(PURCHASE_ORDERS_MODULE, 'delete')
  @HttpCode(HttpStatus.OK)
  @Post(':id/cancel')
  cancel(@Param('id', ParseUUIDPipe) id: string): Promise<PurchaseOrderView> {
    return this.orders.cancel(id);
  }
}

// Vendor bills, goods and charges. Every route needs the Vendor bills permission.
@Controller('purchase-bills')
export class PurchaseBillsController {
  constructor(private readonly bills: PurchaseBillsService) {}

  @RequireAccess(PURCHASE_BILLS_MODULE, 'view')
  @Get()
  list(@Query() query: ListPurchaseBillsQueryDto): Promise<PurchaseBillView[]> {
    return this.bills.list(query);
  }

  @RequireAccess(PURCHASE_BILLS_MODULE, 'view')
  @Get('last-rates')
  lastRates(@Query() query: LastPurchaseRatesQueryDto) {
    return this.bills.lastRates(query);
  }

  @RequireAccess(PURCHASE_BILLS_MODULE, 'view')
  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string): Promise<PurchaseBillView> {
    return this.bills.get(id);
  }

  @RequireAccess(PURCHASE_BILLS_MODULE, 'create')
  @Post()
  create(@Body() dto: CreatePurchaseBillDto, @CurrentAuth() auth: AuthContext): Promise<PurchaseBillView> {
    return this.bills.create(dto, auth.userId);
  }

  @RequireAccess(PURCHASE_BILLS_MODULE, 'edit')
  @Patch(':id/allocation')
  setAllocation(@Param('id', ParseUUIDPipe) id: string, @Body() dto: BillAllocationDto): Promise<PurchaseBillView> {
    return this.bills.setAllocation(id, dto.allocation);
  }

  @RequireAccess(PURCHASE_BILLS_MODULE, 'delete')
  @HttpCode(HttpStatus.OK)
  @Post(':id/void')
  void(@Param('id', ParseUUIDPipe) id: string): Promise<PurchaseBillView> {
    return this.bills.void(id);
  }
}
