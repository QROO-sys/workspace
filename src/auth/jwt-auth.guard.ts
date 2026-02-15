import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    // Prefer Bearer token, fallback to httpOnly cookie
    const header = req.headers['authorization'] as string | undefined;
    let token: string | undefined;
    if (header && header.startsWith('Bearer ')) token = header.slice(7);

    if (!token) token = req.cookies?.access_token;

    if (!token) throw new UnauthorizedException('Missing token');

    const payload = await this.authService.verifyToken(token);
    req.user = { id: payload.sub, email: payload.email, tenantId: payload.tenantId, role: payload.role };
    req.tenantId = payload.tenantId;
    return true;
  }
}
