import { Controller, Get, Query } from '@nestjs/common';
import { RequireAccess } from '../common/decorators/require-access.decorator.js';
import { ProfitQueryDto } from './dto/profit-query.dto.js';
import { ProfitService, type ProfitReportView } from './profit.service.js';

/** The Actual profit screen's permission key (frontend config/navigation.ts). */
export const PROFIT_MODULE = '/profit';

@Controller('profit')
export class ProfitController {
  constructor(private readonly profit: ProfitService) {}

  @RequireAccess(PROFIT_MODULE, 'view')
  @Get()
  report(@Query() query: ProfitQueryDto): Promise<ProfitReportView> {
    return this.profit.report(query);
  }
}
