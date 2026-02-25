import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SessionsService } from '../sessions/sessions.service';

@Controller('db-tools')
export class DbToolsController {
  constructor(private readonly sessions: SessionsService) {}

  // ✅ fixes "Cannot GET /db-tools/summary"
  @UseGuards(JwtAuthGuard)
  @Get('summary')
  async summary(@Req() req: any) {
    return this.sessions.dbSummary(req);
  }

  // ✅ fixes "Cannot GET /db-tools/export"
  @UseGuards(JwtAuthGuard)
  @Get('export')
  async export(@Req() req: any, @Query('kind') kind?: string) {
    return this.sessions.dbExport(req, kind || '');
  }
}
