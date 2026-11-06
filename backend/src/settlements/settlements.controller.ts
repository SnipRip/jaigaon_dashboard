import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { CurrentAuth } from '../common/decorators/current-auth.decorator.js';
import { RequireAccess } from '../common/decorators/require-access.decorator.js';
import type { AuthContext } from '../common/types/authenticated-request.js';
import { ApplyAdvanceDto, CancelSettlementDto, OpenDocumentsQueryDto, SettlementDto, SettlementQueryDto } from './dto/settlement.dto.js';
import type { OpenDocumentView, SettlementView } from './settlement-views.js';
import { SettlementsService } from './settlements.service.js';

/** The Payments & outstanding screen's permission key (frontend config/navigation.ts). */
export const PAYMENTS_MODULE = '/payments';

@Controller('settlements')
export class SettlementsController {
  constructor(private readonly settlements: SettlementsService) {}

  @RequireAccess(PAYMENTS_MODULE, 'view')
  @Get()
  list(@Query() query: SettlementQueryDto): Promise<SettlementView[]> {
    return this.settlements.list(query.direction, query.partyId);
  }

  /** Invoices (receipts) or bills (payments) and opening balances, with what is settled and left. */
  @RequireAccess(PAYMENTS_MODULE, 'view')
  @Get('documents')
  documents(@Query() query: OpenDocumentsQueryDto): Promise<OpenDocumentView[]> {
    return this.settlements.documents(query.direction, query.partyId);
  }

  @RequireAccess(PAYMENTS_MODULE, 'view')
  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string): Promise<SettlementView> {
    return this.settlements.get(id);
  }

  @RequireAccess(PAYMENTS_MODULE, 'create')
  @Post()
  create(@Body() dto: SettlementDto, @CurrentAuth() auth: AuthContext): Promise<SettlementView> {
    return this.settlements.create(dto, auth.userId);
  }

  @RequireAccess(PAYMENTS_MODULE, 'edit')
  @HttpCode(HttpStatus.OK)
  @Post(':id/allocations')
  applyAdvance(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ApplyAdvanceDto): Promise<SettlementView> {
    return this.settlements.applyAdvance(id, dto);
  }

  @RequireAccess(PAYMENTS_MODULE, 'edit')
  @HttpCode(HttpStatus.OK)
  @Post(':id/cancel')
  cancel(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CancelSettlementDto): Promise<SettlementView> {
    return this.settlements.cancel(id, dto.reason);
  }
}
