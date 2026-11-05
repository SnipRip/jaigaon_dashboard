import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { IsOptional, IsUUID } from 'class-validator';
import { CurrentAuth } from '../common/decorators/current-auth.decorator.js';
import { RequireAccess } from '../common/decorators/require-access.decorator.js';
import type { AuthContext } from '../common/types/authenticated-request.js';
import { QuotationDto, QuotationStatusDto, ReviseQuotationDto } from './dto/quotation.dto.js';
import type { QuotationView } from './quotation-views.js';
import { QuotationsService } from './quotations.service.js';

/** The Quotations screen's permission key (frontend config/navigation.ts). */
export const QUOTATIONS_MODULE = '/quotations';

class PartyQueryDto {
  @IsOptional()
  @IsUUID()
  partyId?: string;
}

@Controller('quotations')
export class QuotationsController {
  constructor(private readonly quotations: QuotationsService) {}

  @RequireAccess(QUOTATIONS_MODULE, 'view')
  @Get()
  list(@Query() query: PartyQueryDto): Promise<QuotationView[]> {
    return this.quotations.list(query.partyId);
  }

  @RequireAccess(QUOTATIONS_MODULE, 'view')
  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string): Promise<QuotationView> {
    return this.quotations.get(id);
  }

  @RequireAccess(QUOTATIONS_MODULE, 'create')
  @Post()
  create(@Body() dto: QuotationDto, @CurrentAuth() auth: AuthContext): Promise<QuotationView> {
    return this.quotations.create(dto, auth.userId);
  }

  @RequireAccess(QUOTATIONS_MODULE, 'edit')
  @Put(':id')
  revise(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReviseQuotationDto): Promise<QuotationView> {
    return this.quotations.revise(id, dto);
  }

  @RequireAccess(QUOTATIONS_MODULE, 'edit')
  @HttpCode(HttpStatus.OK)
  @Post(':id/status')
  setStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: QuotationStatusDto): Promise<QuotationView> {
    return this.quotations.setStatus(id, dto.status);
  }
}
