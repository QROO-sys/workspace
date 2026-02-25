import { Injectable, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

function role(req: any) {
  return String(req?.user?.role || '').toUpperCase();
}
function tenantId(req: any): string | null {
  const t = req?.user?.tenantId;
  return t ? String(t) : null;
}
function normStatus(s: any): string {
  return String(s || '').trim().toUpperCase();
}
function isActiveishStatus(s: any): boolean {
  const v = normStatus(s);
  return v === 'ACTIVE' || v === 'CONFIRMED' || v === 'IN_PROGRESS' || v === 'INPROGRESS';
}

@Injectable()
export class SessionsService {
  constructor(private prisma: PrismaService) {}

  // Public: called from /public/sessions/start
  async startPublicSession(dto: any) {
    const now = new Date();
    const endAt = new Date(now.getTime() + 60 * 60 * 1000);

    const created = await this.prisma.booking.create({
      data: {
        tableId: dto.deskId,
        customerName: dto.name,
        customerPhone: dto.phone,
        startAt: now,
        endAt,
        status: ('ACTIVE' as any), // avoid enum compile issues
      } as any,
    } as any);

    return {
      ok: true,
      sessionId: created.id,
      deskId: created.tableId,
      deskName: 'Desk',
      startAt: created.startAt,
      endAt: created.endAt,
    };
  }

  // Staff: current desk occupancies
  async listActive(req: any) {
    const r = role(req);
    if (!['OWNER', 'ADMIN', 'EMPLOYEE'].includes(r)) throw new ForbiddenException('Staff only');

    const tId = tenantId(req);
    const now = new Date();

    const bookings = await this.prisma.booking.findMany({
      where: {
        ...(tId ? ({ tenantId: tId } as any) : {}),
        startAt: { lte: now } as any,
        endAt: { gte: now } as any,
      } as any,
      take: 500,
    } as any);

    const active = (bookings as any[]).filter((b) => isActiveishStatus(b.status));

    const sessions = active.map((b) => {
      const start = new Date(b.startAt);
      const elapsedMs = Math.max(0, now.getTime() - start.getTime());
      const elapsedHours = Math.floor(elapsedMs / (60 * 60 * 1000));

      return {
        bookingId: b.id,
        deskId: b.tableId,
        deskName: 'Desk',
        startAt: b.startAt,
        endAt: b.endAt,
        status: b.status,
        customerName: b.customerName || null,
        customerPhone: b.customerPhone || null,
        freeCoffeeAvailable: elapsedHours,
      };
    });

    return { ok: true, sessions };
  }

  // Staff/Owner: extend a session by hours (approval step)
  async extendSession(req: any, id: string, hours: number) {
    const r = role(req);
    if (!['OWNER', 'ADMIN', 'EMPLOYEE'].includes(r)) throw new ForbiddenException('Staff only');
    if (!Number.isFinite(hours) || hours <= 0 || hours > 12) throw new BadRequestException('Invalid hours');

    const tId = tenantId(req);

    const existing = await this.prisma.booking.findFirst({
      where: tId ? ({ id, tenantId: tId } as any) : ({ id } as any),
    } as any);
    if (!existing) throw new NotFoundException('Session not found');

    const endAt = new Date(existing.endAt);
    const newEndAt = new Date(endAt.getTime() + hours * 60 * 60 * 1000);

    const updated = await this.prisma.booking.update({
      where: { id } as any,
      data: { endAt: newEndAt } as any,
    } as any);

    return { ok: true, sessionId: updated.id, endAt: updated.endAt };
  }

  // Staff: close session early
  async closeSession(req: any, id: string) {
    const r = role(req);
    if (!['OWNER', 'ADMIN', 'EMPLOYEE'].includes(r)) throw new ForbiddenException('Staff only');

    const tId = tenantId(req);

    const existing = await this.prisma.booking.findFirst({
      where: tId ? ({ id, tenantId: tId } as any) : ({ id } as any),
    } as any);
    if (!existing) throw new NotFoundException('Session not found');

    const now = new Date();
    const updated = await this.prisma.booking.update({
      where: { id } as any,
      data: { endAt: now, status: ('COMPLETED' as any) } as any,
    } as any);

    return { ok: true, sessionId: updated.id, endAt: updated.endAt, status: updated.status };
  }

  // Owner/Admin: basic db summary for sessions/bookings
  async dbSummary(req: any) {
    const r = role(req);
    if (!['OWNER', 'ADMIN'].includes(r)) throw new ForbiddenException('Owner/Admin only');

    const tId = tenantId(req);
    const where = tId ? ({ tenantId: tId } as any) : ({} as any);

    const bookings = await this.prisma.booking.count({ where } as any);
    const desks = await this.prisma.table.count({ where } as any);
    const users = await this.prisma.user.count({ where } as any);

    return { ok: true, counts: { desks, bookings, users } };
  }

  // Owner/Admin: export helper
  async dbExport(req: any, kind: string) {
    const r = role(req);
    if (!['OWNER', 'ADMIN'].includes(r)) throw new ForbiddenException('Owner/Admin only');

    const tId = tenantId(req);
    const where = tId ? ({ tenantId: tId } as any) : ({} as any);

    const k = String(kind || '').toLowerCase();
    if (k === 'desks' || k === 'tables') {
      const data = await this.prisma.table.findMany({ where, take: 1000 } as any);
      return { ok: true, kind: 'desks', data };
    }
    if (k === 'bookings' || k === 'sessions') {
      const data = await this.prisma.booking.findMany({ where, take: 5000 } as any);
      return { ok: true, kind: 'bookings', data };
    }
    if (k === 'users') {
      const data = await this.prisma.user.findMany({ where, take: 1000 } as any);
      return { ok: true, kind: 'users', data };
    }

    throw new BadRequestException('Unknown export kind. Use: desks, bookings, users');
  }
}
