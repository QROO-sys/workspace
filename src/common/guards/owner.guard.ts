import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class OwnerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    // Assumes req.user injected via auth middleware
    if (!req.user || !['OWNER', 'MANAGER'].includes(req.user.role)) {
      throw new ForbiddenException('Only OWNER/MANAGER can perform this action');
    }
    return true;
  }
}