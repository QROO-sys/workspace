import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private analytics: AnalyticsService) {}

  @Get('revenue/daily')
  // Staff can see DAILY revenue only (no totals). Owner/Manager can see totals + daily.
  @Roles(Role.OWNER, Role.MANAGER, Role.STAFF)
  async daily(@Req() req: any, @Query('days') days?: string) {
    let nDays = Number(days) || 30;
    if (req.user?.role === Role.STAFF) {
      // Staff: keep it strictly “daily” and prevent reconstructing all-time totals by asking for huge ranges.
      nDays = Math.min(Math.max(nDays, 1), 7);
    }
    const data = await this.analytics.dailyRevenue(req.tenantId, nDays);

    // Do NOT expose totals to STAFF.
    if (req.user?.role === Role.STAFF) {
      return { days: nDays, data };
    }

    const totals = data.reduce(
      (acc, d) => ({ gross: acc.gross + d.gross, completed: acc.completed + d.completed }),
      { gross: 0, completed: 0 },
    );
    return { days: nDays, totals, data };
  }
}
