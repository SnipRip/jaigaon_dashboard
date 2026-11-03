import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { RequireAccess } from '../common/decorators/require-access.decorator.js';
import { ListQueryDto } from '../common/dto/field-validators.js';
import { CreateLedgerGroupDto } from './dto/create-ledger-group.dto.js';
import { CreateLedgerDto } from './dto/create-ledger.dto.js';
import { UpdateLedgerGroupDto } from './dto/update-ledger-group.dto.js';
import { UpdateLedgerDto } from './dto/update-ledger.dto.js';
import { LedgerGroupsService } from './ledger-groups.service.js';
import type { LedgerGroupView, LedgerView } from './ledger-views.js';
import { LedgersService } from './ledgers.service.js';

/** Groups and general ledgers are edited on one screen. */
export const LEDGERS_MODULE = '/masters/ledgers';

// Reading is open to every signed-in user (pickers on loans and, later,
// invoices and bills).
@Controller('ledger-groups')
export class LedgerGroupsController {
  constructor(private readonly groups: LedgerGroupsService) {}

  @Get()
  list(): Promise<LedgerGroupView[]> {
    return this.groups.list();
  }

  @RequireAccess(LEDGERS_MODULE, 'create')
  @Post()
  create(@Body() dto: CreateLedgerGroupDto): Promise<LedgerGroupView> {
    return this.groups.create(dto);
  }

  @RequireAccess(LEDGERS_MODULE, 'edit')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLedgerGroupDto): Promise<LedgerGroupView> {
    return this.groups.update(id, dto);
  }

  @RequireAccess(LEDGERS_MODULE, 'delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.groups.remove(id);
  }
}

@Controller('ledgers')
export class LedgersController {
  constructor(private readonly ledgers: LedgersService) {}

  @Get()
  list(@Query() query: ListQueryDto): Promise<LedgerView[]> {
    return this.ledgers.list(query.includeArchived);
  }

  @RequireAccess(LEDGERS_MODULE, 'create')
  @Post()
  create(@Body() dto: CreateLedgerDto): Promise<LedgerView> {
    return this.ledgers.create(dto);
  }

  @RequireAccess(LEDGERS_MODULE, 'edit')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLedgerDto): Promise<LedgerView> {
    return this.ledgers.update(id, dto);
  }

  @RequireAccess(LEDGERS_MODULE, 'delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.ledgers.remove(id);
  }
}
