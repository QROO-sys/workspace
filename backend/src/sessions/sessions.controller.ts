import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller()
export class SessionsController {
  constructor(private sessions: SessionsService) {}

  // Public: start session (occupancy) from QR guest page
  @Post('public/sessions/start')
  async start(@Body() dto: any) {
    return this.sessions.startPublicSession(dto);
  }

  // Staff: list active sessions (occupancies)
  @UseGuards(JwtAuthGuard)
  @Get('sessions/active')
  async active(@Req() req: any) {
    return this.sessions.listActive(req);
  }

  // Staff: extend session by N hours
  @UseGuards(JwtAuthGuard)
  @Patch('sessions/:id/extend')
  async extend(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    const hours = Number(dto?.hours || 1);
    return this.sessions.extendSession(req, id, hours);
  }

  // Staff: close session now
  @UseGuards(JwtAuthGuard)
  @Patch('sessions/:id/close')
  async close(@Req() req: any, @Param('id') id: string) {
    return this.sessions.closeSession(req, id);
  }

  // Owner DB tools (safe)
  @UseGuards(JwtAuthGuard)
  @Get('db-tools/summary')
  async summary(@Req() req: any) {
    return this.sessions.dbSummary(req);
  }

  @UseGuards(JwtAuthGuard)
  @Get('db-tools/export')
  async export(@Req() req: any, @Query('kind') kind: string) {
    return this.sessions.dbExport(req, kind);
  }
}
