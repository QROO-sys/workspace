import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

function roleOf(req: any): string {
  return String(req?.user?.role || '').toLowerCase();
}
function isStaff(req: any): boolean {
  const r = roleOf(req);
  return r === 'owner' || r === 'admin' || r === 'employee' || r === 'staff' || r === 'manager';
}
function isOwner(req: any): boolean {
  const r = roleOf(req);
  return r === 'owner';
}
function hoursBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.max(0, ms / (1000 * 60 * 60));
}

@Injectable()
export class SessionsService {
  constructor(private prisma: PrismaService) {}

  // "Sessions" are current occupancies. We implement them using Booking rows:
  // Active session = booking with startAt <= now <= endAt and status in active-ish states.
  async listActive(req: any) {
    if (!isStaff(req)) throw new ForbiddenException('Staff only');

    const now = new Date();

    const activeBookings = await this.prisma.booking.findMany({
      where: {
        deleted: false,
        startAt: { lte: now },
        endAt: { gte: now },
        status: { in: ['ACTIVE', 'active', 'CONFIRMED', 'confirmed', 'IN_PROGRESS', 'in_progress'] },
      },
      include: {
        table: true, // desk
      },
      orderBy: { startAt: 'asc' },
      take: 100,
    });

    // Compute free coffee credits:
    // 1 free coffee per *completed* hour since session start.
    // Credits used = number of coffee order items placed during session time window.
    // We detect coffee by sku === 'COFFEE' OR name normalized 'coffee' (matches your OrderService approach).
    const results = [];
    for (const b of activeBookings) {
      const startAt = b.startAt as Date;
      const elapsedHours = Math.floor(hoursBetween(startAt, now));
      const tableId = (b as any).tableId;

      // Count coffee items in orders during the active session time window
      const orders = await this.prisma.order.findMany({
        where: {
          tableId,
          createdAt: { gte: startAt, lte: now },
          deleted: false,
        },
        include: {
          orderItems: { include: { menuItem: true } },
        },
        take: 200,
      });

      let coffeeUsed = 0;
      for (const o of orders) {
        for (const oi of (o as any).orderItems || []) {
          const sku = String(oi?.menuItem?.sku || '').toUpperCase();
          const name = String(oi?.menuItem?.name || '').trim().toLowerCase();
          const isCoffee = sku === 'COFFEE' || name === 'coffee';
          if (isCoffee) coffeeUsed += Number(oi?.quantity || 1);
        }
      }

      const freeCoffeeEarned = elapsedHours;
      const freeCoffeeAvailable = Math.max(0, freeCoffeeEarned - coffeeUsed);

      results.push({
        bookingId: b.id,
        deskId: tableId,
        deskName: (b as any).table?.name || '',
        startAt: b.startAt,
        endAt: b.endAt,
        status: b.status,
        customerName: (b as any).customerName || '',
        customerPhone: (b as any).customerPhone || '',
        freeCoffeeEarned,
        coffeeUsed,
        freeCoffeeAvailable,
      });
    }

    return { ok: true, sessions: results };
  }

  async startPublicSession(dto: any) {
    const deskId = String(dto?.deskId || '');
    if (!deskId) throw new BadRequestException('deskId required');
    if (!dto?.policyAccepted) throw new BadRequestException('policyAccepted required');

    const now = new Date();

    // Default 1 hour session (can be extended)
    const end = new Date(now.getTime() + 60 * 60 * 1000);

    // Prevent starting a session if desk already occupied now
    const overlap = await this.prisma.booking.findFirst({
      where: {
        deleted: false,
        tableId: deskId,
        startAt: { lte: now },
        endAt: { gte: now },
        status: { in: ['ACTIVE', 'active', 'CONFIRMED', 'confirmed', 'IN_PROGRESS', 'in_progress'] },
      },
    });
    if (overlap) throw new BadRequestException('Desk is currently occupied');

    // Create booking-as-session
    const created = await this.prisma.booking.create({
      data: {
        tableId: deskId,
        startAt: now,
        endAt: end,
        status: 'ACTIVE',
        customerName: String(dto?.name || dto?.customerName || ''),
        customerPhone: String(dto?.phone || dto?.customerPhone || ''),
        source: 'WALKIN',
      } as any,
      include: { table: true },
    });

    // Token for guest ordering can be implemented later; for now return bookingId as session handle.
    return {
      ok: true,
      sessionId: created.id,
      deskId,
      deskName: (created as any).table?.name || '',
      startAt: created.startAt,
      endAt: created.endAt,
    };
  }

  async extendSession(req: any, bookingId: string, hours: number) {
    if (!isStaff(req)) throw new ForbiddenException('Staff only');
    if (!Number.isFinite(hours) || hours <= 0) throw new BadRequestException('hours must be > 0');

    const existing = await this.prisma.booking.findFirst({
      where: { id: bookingId, deleted: false },
      include: { table: true },
    });
    if (!existing) throw new NotFoundException('Session not found');

    const endAt = existing.endAt as Date;
    const newEnd = new Date(endAt.getTime() + hours * 60 * 60 * 1000);

    const updated = await this.prisma.booking.update({
      where: { id: bookingId } as any,
      data: { endAt: newEnd } as any,
      include: { table: true },
    });

    return { ok: true, session: updated };
  }

  async closeSession(req: any, bookingId: string) {
    if (!isStaff(req)) throw new ForbiddenException('Staff only');

    const existing = await this.prisma.booking.findFirst({
      where: { id: bookingId, deleted: false },
      include: { table: true },
    });
    if (!existing) throw new NotFoundException('Session not found');

    const now = new Date();
    const updated = await this.prisma.booking.update({
      where: { id: bookingId } as any,
      data: { endAt: now, status: 'CLOSED' } as any,
      include: { table: true },
    });

    return { ok: true, session: updated };
  }

  async dbSummary(req: any) {
    if (!isOwner(req)) throw new ForbiddenException('Owner only');

    const [users, desks, menuItems, bookings, orders] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.table.count(),
      this.prisma.menuItem.count(),
      this.prisma.booking.count(),
      this.prisma.order.count(),
    ]);

    return {
      ok: true,
      counts: { users, desks, menuItems, bookings, orders },
      note: 'Owner DB access is read-only summary + exports (no raw SQL).',
    };
  }

  async dbExport(req: any, kind: string) {
    if (!isOwner(req)) throw new ForbiddenException('Owner only');

    const k = String(kind || '').toLowerCase();
    if (k === 'users') return { ok: true, rows: await this.prisma.user.findMany({ take: 200, orderBy: { createdAt: 'desc' } as any }) };
    if (k === 'desks') return { ok: true, rows: await this.prisma.table.findMany({ take: 200, orderBy: { createdAt: 'desc' } as any }) };
    if (k === 'menu-items') return { ok: true, rows: await this.prisma.menuItem.findMany({ take: 200, orderBy: { createdAt: 'desc' } as any }) };
    if (k === 'bookings') return { ok: true, rows: await this.prisma.booking.findMany({ take: 200, orderBy: { startAt: 'desc' } as any, include: { table: true } as any }) };
    if (k === 'orders') return { ok: true, rows: await this.prisma.order.findMany({ take: 200, orderBy: { createdAt: 'desc' } as any, include: { table: true, orderItems: { include: { menuItem: true } } } as any }) };

    throw new BadRequestException('Unknown export kind');
  }
}
