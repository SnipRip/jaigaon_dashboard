import { Controller, Get, Query } from '@nestjs/common';
import { IsOptional } from 'class-validator';
import { RequireAccess } from '../common/decorators/require-access.decorator.js';
import { todayInIndia } from '../common/dates.js';
import { IsIsoDate } from '../common/dto/field-validators.js';
import { BooksService, type BalanceSheetView, type ProfitAndLossView, type TrialBalanceView } from './books.service.js';

class AsOfQueryDto {
  /** Defaults to today in India. */
  @IsOptional()
  @IsIsoDate('Pick the date')
  asOf?: string;
}

/** The three statements share one permission: they show the whole books. */
export const BOOKS_MODULE = '/financial-statements';

@Controller('books')
export class BooksController {
  constructor(private readonly books: BooksService) {}

  @RequireAccess(BOOKS_MODULE, 'view')
  @Get('trial-balance')
  trialBalance(@Query() query: AsOfQueryDto): Promise<TrialBalanceView> {
    return this.books.trialBalance(query.asOf ?? todayInIndia());
  }

  @RequireAccess(BOOKS_MODULE, 'view')
  @Get('profit-and-loss')
  profitAndLoss(@Query() query: AsOfQueryDto): Promise<ProfitAndLossView> {
    return this.books.profitAndLoss(query.asOf ?? todayInIndia());
  }

  @RequireAccess(BOOKS_MODULE, 'view')
  @Get('balance-sheet')
  balanceSheet(@Query() query: AsOfQueryDto): Promise<BalanceSheetView> {
    return this.books.balanceSheet(query.asOf ?? todayInIndia());
  }
}
