import { Controller, Post, Body, Get, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private svc: AuthService) {}

  @Post('register')
  async register(@Body() body: any, @Res({ passthrough: true }) res: Response) {
    // { email, password, name, role, tenantId }
    const token = await this.svc.register(body.email, body.password, body.name, body.role, body.tenantId);
    res.cookie('access_token', token.access_token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
    });
    return { ok: true };
  }

  @Post('login')
  async login(@Body() body: any, @Res({ passthrough: true }) res: Response) {
    // { email, password }
    const token = await this.svc.login(body.email, body.password);
    res.cookie('access_token', token.access_token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
    });
    return { ok: true };
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', { path: '/' });
    return { ok: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: any) {
    return { user: req.user };
  }
}
