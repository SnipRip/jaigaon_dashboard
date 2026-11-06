import { Controller, Get } from '@nestjs/common';
import { CurrentAuth } from '../common/decorators/current-auth.decorator.js';
import type { AuthContext } from '../common/types/authenticated-request.js';
import type { DashboardView } from './dashboard-views.js';
import { DashboardService } from './dashboard.service.js';

// Open to every signed-in user: the service leaves out each section whose
// screen the user's role may not open.
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  summary(@CurrentAuth() auth: AuthContext): Promise<DashboardView> {
    return this.dashboard.summary(auth);
  }
}
