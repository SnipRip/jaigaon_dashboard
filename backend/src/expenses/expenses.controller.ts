import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { CurrentAuth } from '../common/decorators/current-auth.decorator.js';
import { RequireAccess } from '../common/decorators/require-access.decorator.js';
import type { AuthContext } from '../common/types/authenticated-request.js';
import { CancelExpenseDto, CreateExpenseDto, ExpenseQueryDto } from './dto/expense.dto.js';
import type { ExpenseView } from './expense-views.js';
import { ExpensesService } from './expenses.service.js';

/** The Expenses screen's permission key (frontend config/navigation.ts). */
export const EXPENSES_MODULE = '/expenses';

@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @RequireAccess(EXPENSES_MODULE, 'view')
  @Get()
  list(@Query() query: ExpenseQueryDto): Promise<ExpenseView[]> {
    return this.expenses.list(query);
  }

  @RequireAccess(EXPENSES_MODULE, 'view')
  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string): Promise<ExpenseView> {
    return this.expenses.get(id);
  }

  @RequireAccess(EXPENSES_MODULE, 'create')
  @Post()
  create(@Body() dto: CreateExpenseDto, @CurrentAuth() auth: AuthContext): Promise<ExpenseView> {
    return this.expenses.create(dto, auth.userId);
  }

  @RequireAccess(EXPENSES_MODULE, 'edit')
  @HttpCode(HttpStatus.OK)
  @Post(':id/cancel')
  cancel(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CancelExpenseDto): Promise<ExpenseView> {
    return this.expenses.cancel(id, dto.reason);
  }
}
