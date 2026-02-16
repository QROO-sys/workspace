import { BadRequestException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { BookingStatus } from '@prisma/client';
import { CreateBookingDto } from './dto';
import { SmsService } from '../sms/sms.service';

function toDate(iso: string): Date {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) throw new BadRequestException('Invalid date');
  return d;
}

function validateRange(startAt: Date, endAt: Date) {
  if (!(startAt instanceof Date) || !(endAt instanceof Date)) {
    throw new BadRequestException('Invalid date range');
  }
  if (startAt >= endAt) {
    throw new BadRequestException('startAt must be before endAt');
  }
  // Hard cap to prevent accidental huge bookings (MVP safety)
  const maxHours = 24;
  const diffHrs = (endAt.getTime() - startAt.getTime()) / (1000 * 60 * 60);
  if (diffHrs > maxHours) {
    throw new BadRequestException(`Booking too long (max ${maxHours} hours)`);
  }
}

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);
  constructor(
    private prisma: PrismaService,
    private sms: SmsService
  ) {}

  private async ensureDesk(tableId: string) {
    const desk = await this.prisma.table.findFirst({ where: { id: tableId, deleted: false } });
    if (!desk) throw new NotFoundException('Desk not found');
    return desk;
  }

  private async ensureNoOverlap(tenantId: string, tableId: string, startAt: Date, endAt: Date) {
    const overlap = await this.prisma.booking.findFirst({
      where: {
        tenantId,
        tableId,
        deleted: false,
        status: { in: [BookingStatus.RESERVED, BookingStatus.CHECKED_IN] },
        // Overlap condition: start < existing.end && end > existing.start
        AND: [
          { startAt: { lt: endAt } },
          { endAt: { gt: startAt } },
        ],
      },
    });
    if (overlap) {
      throw new BadRequestException('That time slot is already booked');
    }
  }

  async listForTenant(
    tenantId: string,
    query?: { from?: string; to?: string; tableId?: string; status?: string }
  ) {
    const now = new Date();
    const from = query?.from ? toDate(query.from) : new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const to = query?.to ? toDate(query.to) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const where: any = {
      tenantId,
      deleted: false,
      // any overlap with the requested window
      AND: [{ startAt: { lt: to } }, { endAt: { gt: from } }],
    };

    if (query?.tableId) where.tableId = query.tableId;
    if (query?.status) where.status = query.status;

    return this.prisma.booking.findMany({
      where,
      orderBy: { startAt: 'asc' },
      include: { table: true },
    });
  }

  async createForTenant(tenantId: string, createdByUserId: string, dto: CreateBookingDto) {
    const desk = await this.ensureDesk(dto.tableId);
    if (desk.tenantId !== tenantId) throw new NotFoundException('Desk not found');

    const startAt = toDate(dto.startAt);
    const endAt = toDate(dto.endAt);
    validateRange(startAt, endAt);

    await this.ensureNoOverlap(tenantId, desk.id, startAt, endAt);

    const created = await this.prisma.booking.create({
      data: {
        tenantId,
        tableId: desk.id,
        startAt,
        endAt,
        status: BookingStatus.RESERVED,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        customerNationalIdPath: dto.customerNationalIdPath,
        notes: dto.notes,
        createdByUserId,
      },
      include: { table: true },
    });

    void this.sms
      .sendToAdmin(
        `📅 New booking: ${created.table.name} ${created.startAt.toISOString()} → ${created.endAt.toISOString()}${created.customerName ? ` | ${created.customerName}` : ''}${created.customerPhone ? ` (${created.customerPhone})` : ''}`,
      )
      .then((r) => {
        if (!r.ok) this.logger.warn(`[SMS] ${r.error}`);
      });

    return created;
  }

  async cancelForTenant(tenantId: string, id: string) {
    const existing = await this.prisma.booking.findFirst({ where: { id, tenantId, deleted: false } });
    if (!existing) throw new NotFoundException('Booking not found');

    const updated = await this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CANCELLED },
      include: { table: true },
    });

    void this.sms
      .sendToAdmin(`❌ Booking cancelled: ${updated.table.name} ${updated.startAt.toISOString()} → ${updated.endAt.toISOString()}`)
      .then((r) => {
        if (!r.ok) this.logger.warn(`[SMS] ${r.error}`);
      });

    return updated;
  }

  // Public (guest) API
  async listForDeskPublic(deskId: string, from: string, to: string) {
    const desk = await this.ensureDesk(deskId);
    const start = toDate(from);
    const end = toDate(to);
    validateRange(start, end);

    return this.prisma.booking.findMany({
      where: {
        tenantId: desk.tenantId,
        tableId: desk.id,
        deleted: false,
        status: { in: [BookingStatus.RESERVED, BookingStatus.CHECKED_IN] },
        AND: [{ startAt: { lt: end } }, { endAt: { gt: start } }],
      },
      orderBy: { startAt: 'asc' },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        status: true,
      },
    });
  }

  async createPublicForDesk(deskId: string, dto: Omit<CreateBookingDto, 'tableId'>) {
    const desk = await this.ensureDesk(deskId);
    const startAt = toDate(dto.startAt);
    const endAt = toDate(dto.endAt);
    validateRange(startAt, endAt);

    await this.ensureNoOverlap(desk.tenantId, desk.id, startAt, endAt);

    const created = await this.prisma.booking.create({
      data: {
        tenantId: desk.tenantId,
        tableId: desk.id,
        startAt,
        endAt,
        status: BookingStatus.RESERVED,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        customerNationalIdPath: dto.customerNationalIdPath,
        notes: dto.notes,
        createdByUserId: null,
      },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        status: true,
      },
    });

    void this.sms
      .sendToAdmin(
        `📱 Guest booking: ${desk.name} ${created.startAt.toISOString()} → ${created.endAt.toISOString()}${dto.customerName ? ` | ${dto.customerName}` : ''}${dto.customerPhone ? ` (${dto.customerPhone})` : ''}`,
      )
      .then((r) => {
        if (!r.ok) this.logger.warn(`[SMS] ${r.error}`);
      });

    return created;
  }
}
