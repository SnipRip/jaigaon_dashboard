import { Module } from '@nestjs/common';
import { ProfitModule } from '../profit/profit.module.js';
import { SettlementsModule } from '../settlements/settlements.module.js';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';

// Reports & MIS (SOW 16): read-only rows for each report.
@Module({
  imports: [ProfitModule, SettlementsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
