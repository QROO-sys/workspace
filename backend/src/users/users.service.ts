import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

function reqRole(req: any): string {
  return String(req?.user?.role || '').toUpperCase();
}
function reqTenantId(req: any): string | null {
  const t = req?.user?.tenantId;
  return t ? String(t) : null;
}
function reqUserId(req: any): string | null {
  const sub = req?.user?.sub ?? req?.user?.userId ?? req?.user?.id;
  return sub ? String(sub) : null;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async listUsers(req: any) {
    const r = reqRole(req);
    if (r !== 'OWNER' && r !== 'ADMIN') throw new ForbiddenException('Owner/Admin only');

    const tenantId = reqTenantId(req);

    const where = tenantId ? ({ tenantId } as any) : ({} as any);

    const users = await this.prisma.user.findMany({
      where,
      take: 200,
      select: {
        id: true,
        email: true,
        role: true,
        tenantId: true,
      } as any,
    });

    return { ok: true, users };
  }

  async updateUserRole(req: any, id: string, role: string) {
    if (reqRole(req) !== 'OWNER') throw new ForbiddenException('Owner only');

    const tenantId = reqTenantId(req);

    const existing = await this.prisma.user.findFirst({
      where: tenantId ? ({ id, tenantId } as any) : ({ id } as any),
      select: { id: true, email: true, role: true, tenantId: true } as any,
    });

    if (!existing) throw new NotFoundException('User not found');

    const me = reqUserId(req);
    if (me && me === id && role !== 'OWNER') {
      throw new ForbiddenException('You cannot change your own role away from OWNER');
    }

    const updated = await this.prisma.user.update({
      where: { id } as any,
      data: { role } as any,
      select: { id: true, email: true, role: true, tenantId: true } as any,
    });

    return { ok: true, user: updated };
  }
}
