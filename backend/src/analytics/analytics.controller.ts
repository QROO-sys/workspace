import { Controller, Get, Query, Req, UseGuards, ForbiddenException, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

function reqRole(req: any): string {
  return String(req?.user?.role || '').toUpperCase();
}
function assertOwner(req: any) {
  if (reqRole(req) !== 'OWNER') throw new ForbiddenException('Owner only');
}

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  // Daily revenue: Admin/Employee allowed; Owner allowed
  @UseGuards(JwtAuthGuard)
  @Get('revenue/daily')
  async daily(@Req() req: any) {
    return this.analytics.revenueDaily(req);
  }

  // Yearly revenue: Owner only
  @UseGuards(JwtAuthGuard)
  @Get('revenue/yearly')
  async yearly(@Req() req: any, @Query('year') yearStr?: string) {
    assertOwner(req);
    const year = Number(yearStr || new Date().getFullYear());
    if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new BadRequestException('Invalid year');
    return this.analytics.revenueYearly(req, year);
  }

  // All-time revenue: Owner only
  @UseGuards(JwtAuthGuard)
  @Get('revenue/alltime')
  async alltime(@Req() req: any) {
    assertOwner(req);
    return this.analytics.revenueAllTime(req);
  }
}
