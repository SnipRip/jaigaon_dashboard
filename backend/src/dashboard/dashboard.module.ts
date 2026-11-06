import { Module } from '@nestjs/common';
import { DocumentRegisterModule } from '../document-register/document-register.module.js';
import { ProfitModule } from '../profit/profit.module.js';
import { SettlementsModule } from '../settlements/settlements.module.js';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';

// The Dashboard's summary (SOW 1): sales, purchases, profit, outstanding,
// papers missing, low stock, pending quotations and trucks. Read-only.
@Module({
  imports: [ProfitModule, SettlementsModule, DocumentRegisterModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
