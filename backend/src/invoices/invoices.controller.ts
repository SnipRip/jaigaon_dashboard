import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { IsOptional, IsUUID } from 'class-validator';
import { CurrentAuth } from '../common/decorators/current-auth.decorator.js';
import { RequireAccess } from '../common/decorators/require-access.decorator.js';
import type { AuthContext } from '../common/types/authenticated-request.js';
import { CancelInvoiceDto, InvoiceDto } from './dto/invoice.dto.js';
import type { InvoiceView } from './invoice-views.js';
import { InvoicesService } from './invoices.service.js';

/** The Sales & invoices screen's permission key (frontend config/navigation.ts). */
export const INVOICES_MODULE = '/invoices';

class PartyQueryDto {
  @IsOptional()
  @IsUUID()
  partyId?: string;
}

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @RequireAccess(INVOICES_MODULE, 'view')
  @Get()
  list(@Query() query: PartyQueryDto): Promise<InvoiceView[]> {
    return this.invoices.list(query.partyId);
  }

  @RequireAccess(INVOICES_MODULE, 'view')
  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string): Promise<InvoiceView> {
    return this.invoices.get(id);
  }

  @RequireAccess(INVOICES_MODULE, 'create')
  @Post()
  create(@Body() dto: InvoiceDto, @CurrentAuth() auth: AuthContext): Promise<InvoiceView> {
    return this.invoices.create(dto, auth.userId);
  }

  @RequireAccess(INVOICES_MODULE, 'edit')
  @HttpCode(HttpStatus.OK)
  @Post(':id/cancel')
  cancel(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CancelInvoiceDto): Promise<InvoiceView> {
    return this.invoices.cancel(id, dto.reason);
  }
}
