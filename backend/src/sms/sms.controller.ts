import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OwnerGuard } from '../auth/owner.guard';
import { SmsService } from './sms.service';

@Controller('sms')
@UseGuards(JwtAuthGuard)
export class SmsController {
  constructor(private readonly sms: SmsService) {}

  // Owner-only: verify SMS config from the UI without digging through logs.
  @Post('test')
  @UseGuards(OwnerGuard)
  async test(@Req() req: any, @Body() body: { to?: string; message?: string }) {
    const to = (body?.to || process.env.SMS_ADMIN_TO || '').trim();
    const msg = String(body?.message ?? `QROO test SMS from ${req.user?.email || 'owner'}`).trim();
    const res = await this.sms.send(to, msg);
    return { to, provider: process.env.SMS_PROVIDER || 'console', ...res };
  }
}
