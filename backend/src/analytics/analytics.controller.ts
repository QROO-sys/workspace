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
  @Roles(Role.OWNER, Role.MANAGER)
  async daily(@Req() req: any, @Query('days') days?: string) {
    const data = await this.analytics.dailyRevenue(req.tenantId, Number(days) || 30);
    const totals = data.reduce(
      (acc, d) => ({ gross: acc.gross + d.gross, completed: acc.completed + d.completed }),
      { gross: 0, completed: 0 }
    );
    return { days: Number(days) || 30, totals, data };
  }
}
