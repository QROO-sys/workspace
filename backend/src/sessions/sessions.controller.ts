import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SessionsService } from './sessions.service';

@Controller()
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  // Public start (called by guest QR flow)
  @Post('public/sessions/start')
  async startPublic(@Body() dto: any) {
    return this.sessions.startPublicSession(dto);
  }

  // Staff list active sessions
  @UseGuards(JwtAuthGuard)
  @Get('sessions/active')
  async active(@Req() req: any) {
    return this.sessions.listActive(req);
  }

  // Staff extend session (approval step)
  @UseGuards(JwtAuthGuard)
  @Patch('sessions/:id/extend')
  async extend(@Req() req: any, @Param('id') id: string, @Query('hours') hoursStr?: string) {
    const hours = Number(hoursStr || 1);
    return this.sessions.extendSession(req, id, hours);
  }

  // Staff close session
  @UseGuards(JwtAuthGuard)
  @Patch('sessions/:id/close')
  async close(@Req() req: any, @Param('id') id: string) {
    return this.sessions.closeSession(req, id);
  }

  // DB tools
  @UseGuards(JwtAuthGuard)
  @Get('sessions/db/summary')
  async summary(@Req() req: any) {
    return this.sessions.dbSummary(req);
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions/db/export')
  async export(@Req() req: any, @Query('kind') kind?: string) {
    return this.sessions.dbExport(req, kind || '');
  }
}
