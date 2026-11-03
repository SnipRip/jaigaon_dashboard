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
import { ListQueryDto } from '../common/dto/field-validators.js';
import { RequireAccess } from '../common/decorators/require-access.decorator.js';
import { CreateLoanDto } from './dto/create-loan.dto.js';
import { RecordLoanEntryDto } from './dto/record-loan-entry.dto.js';
import { UpdateLoanDto } from './dto/update-loan.dto.js';
import type { LoanDetailView, LoanReminderView, LoanView } from './loan-view.js';
import { LoansService } from './loans.service.js';

const MODULE = '/loans';

// Loans are the owners' figures: reading needs the Loans permission too.
@Controller('loans')
export class LoansController {
  constructor(private readonly loans: LoansService) {}

  @RequireAccess(MODULE, 'view')
  @Get()
  list(@Query() query: ListQueryDto): Promise<LoanView[]> {
    return this.loans.list(query.includeArchived);
  }

  /** Before `:id`, so "reminders" is not read as an id. */
  @RequireAccess(MODULE, 'view')
  @Get('reminders')
  reminders(): Promise<LoanReminderView[]> {
    return this.loans.reminders();
  }

  @RequireAccess(MODULE, 'view')
  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string): Promise<LoanDetailView> {
    return this.loans.get(id);
  }

  @RequireAccess(MODULE, 'create')
  @Post()
  create(@Body() dto: CreateLoanDto): Promise<LoanDetailView> {
    return this.loans.create(dto);
  }

  @RequireAccess(MODULE, 'edit')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLoanDto): Promise<LoanDetailView> {
    return this.loans.update(id, dto);
  }

  @RequireAccess(MODULE, 'delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.loans.remove(id);
  }

  @RequireAccess(MODULE, 'create')
  @Post(':id/entries')
  recordEntry(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RecordLoanEntryDto): Promise<LoanDetailView> {
    return this.loans.recordEntry(id, dto);
  }

  @RequireAccess(MODULE, 'edit')
  @Post(':id/entries/:entryId/cancel')
  @HttpCode(HttpStatus.OK)
  cancelEntry(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
  ): Promise<LoanDetailView> {
    return this.loans.cancelEntry(id, entryId);
  }
}
