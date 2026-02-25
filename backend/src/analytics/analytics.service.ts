import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

function reqRole(req: any): string {
  return String(req?.user?.role || '').toUpperCase();
}
function reqTenantId(req: any): string | null {
  const t = req?.user?.tenantId;
  return t ? String(t) : null;
}

function sumOrderValue(o: any): number {
  const candidates = [o?.total, o?.amount, o?.sum, o?.grandTotal, o?.subtotal];
  for (const c of candidates) {
    const v = Number(c);
    if (Number.isFinite(v)) return v;
  }
  return 0;
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async revenueDaily(req: any) {
    const r = reqRole(req);
    if (!['OWNER', 'ADMIN', 'EMPLOYEE'].includes(r)) throw new ForbiddenException('Staff only');

    const tenantId = reqTenantId(req);

    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: start, lte: now },
        // don’t assume deleted field exists in schema; tolerate by not filtering it in Prisma
      } as any,
      take: 2000,
      orderBy: { createdAt: 'desc' } as any,
    });

    const scoped = tenantId ? orders.filter((o: any) => String(o?.tenantId || o?.table?.tenantId || '') === tenantId) : orders;

    const total = scoped.reduce((acc: number, o: any) => acc + sumOrderValue(o), 0);

    return {
      ok: true,
      range: { start: start.toISOString(), end: now.toISOString() },
      total,
      count: scoped.length,
    };
  }

  async revenueYearly(req: any, year: number) {
    if (reqRole(req) !== 'OWNER') throw new ForbiddenException('Owner only');

    const tenantId = reqTenantId(req);

    const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0));

    const orders = await this.prisma.order.findMany({
      where: { createdAt: { gte: start, lt: end } } as any,
      take: 50000,
      orderBy: { createdAt: 'desc' } as any,
    });

    const scoped = tenantId ? orders.filter((o: any) => String(o?.tenantId || o?.table?.tenantId || '') === tenantId) : orders;

    const total = scoped.reduce((acc: number, o: any) => acc + sumOrderValue(o), 0);

    // monthly breakdown
    const byMonth = Array.from({ length: 12 }, () => 0);
    for (const o of scoped as any[]) {
      const t = new Date(o?.createdAt).getTime();
      if (!Number.isFinite(t)) continue;
      const d = new Date(t);
      const m = d.getUTCMonth();
      byMonth[m] += sumOrderValue(o);
    }

    return {
      ok: true,
      year,
      total,
      byMonth, // index 0..11
      count: scoped.length,
    };
  }

  async revenueAllTime(req: any) {
    if (reqRole(req) !== 'OWNER') throw new ForbiddenException('Owner only');

    const tenantId = reqTenantId(req);

    const orders = await this.prisma.order.findMany({
      take: 100000,
      orderBy: { createdAt: 'desc' } as any,
    });

    const scoped = tenantId ? orders.filter((o: any) => String(o?.tenantId || o?.table?.tenantId || '') === tenantId) : orders;

    const total = scoped.reduce((acc: number, o: any) => acc + sumOrderValue(o), 0);

    return { ok: true, total, count: scoped.length };
  }
}
