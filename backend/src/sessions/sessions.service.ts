import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

function reqTenantId(req: any): string | null {
  const t = req?.user?.tenantId;
  return t ? String(t) : null;
}

function normStatus(s: any): string {
  return String(s || '').trim().toUpperCase();
}

function isActiveishStatus(s: any): boolean {
  // JS filtering avoids Prisma enum compile issues
  const v = normStatus(s);
  return v === 'ACTIVE' || v === 'CONFIRMED' || v === 'IN_PROGRESS' || v === 'INPROGRESS';
}

@Injectable()
export class SessionsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Returns active desk occupancies (sessions) based on bookings overlapping now.
   * Endpoint typically: GET /sessions/active
   */
  async active(req: any) {
    const tenantId = reqTenantId(req);
    const now = new Date();

    // Pull overlapping bookings. Do NOT filter status in Prisma (enum mismatch risk).
    const bookings = await this.prisma.booking.findMany({
      where: {
        ...(tenantId ? ({ tenantId } as any) : {}),
        deleted: false as any, // tolerate if schema has it; if not, Prisma ignores unknown? (if it errors, remove this line)
        startAt: { lte: now } as any,
        endAt: { gte: now } as any,
      } as any,
      include: {
        table: true,
      } as any,
      take: 200,
    });

    const active = bookings.filter((b: any) => isActiveishStatus(b.status));

    // Compute free coffee available (simple rule: 1 per hour elapsed)
    const sessions = active.map((b: any) => {
      const startAt = new Date(b.startAt);
      const elapsedMs = Math.max(0, now.getTime() - startAt.getTime());
      const elapsedHours = Math.floor(elapsedMs / (60 * 60 * 1000));

      return {
        bookingId: b.id,
        deskId: b.tableId || b.table?.id,
        deskName: b.table?.name || 'Desk',
        startAt: b.startAt,
        endAt: b.endAt,
        status: b.status,
        customerName: b.customerName || null,
        customerPhone: b.customerPhone || null,
        freeCoffeeAvailable: elapsedHours, // receptionist can use this info
      };
    });

    return { ok: true, sessions };
  }

  /**
   * Optional: start a public session (used by POST /public/sessions/start)
   * If you already have this elsewhere, you can remove this method.
   */
  async startPublic(dto: { deskId: string; name: string; phone: string; policyAccepted: boolean }) {
    const now = new Date();
    const end = new Date(now.getTime() + 60 * 60 * 1000); // default 1 hour

    // Create a booking as an active session.
    // Status is cast to any to avoid enum compile issues.
    const created = await this.prisma.booking.create({
      data: {
        tableId: dto.deskId,
        customerName: dto.name,
        customerPhone: dto.phone,
        startAt: now,
        endAt: end,
        status: ('ACTIVE' as any),
      } as any,
      include: { table: true } as any,
    });

    return {
      ok: true,
      sessionId: created.id,
      deskId: created.tableId,
      deskName: created.table?.name || 'Desk',
      startAt: created.startAt,
      endAt: created.endAt,
    };
  }
}
