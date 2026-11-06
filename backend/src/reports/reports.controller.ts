import { Controller, Get, Param, Query } from '@nestjs/common';
import { CurrentAuth } from '../common/decorators/current-auth.decorator.js';
import type { AuthContext } from '../common/types/authenticated-request.js';
import { ReportQueryDto } from './dto/report-query.dto.js';
import { ReportsService, type ReportView } from './reports.service.js';

// The service checks Reports and every screen the report's data comes from.
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get(':id')
  report(@CurrentAuth() auth: AuthContext, @Param('id') id: string, @Query() query: ReportQueryDto): Promise<ReportView> {
    return this.reports.report(auth, id, query);
  }
}
