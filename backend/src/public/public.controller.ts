import { Controller, Get, Param, NotFoundException, Query } from '@nestjs/common';
import { BookingStatus, OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Controller('public')
export class PublicController {
  constructor(private prisma: PrismaService) {}

  @Get('desks/:id')
  async deskWithMenu(@Param('id') id: string) {
    const desk = await this.prisma.table.findFirst({ where: { id, deleted: false } });
    if (!desk) throw new NotFoundException('Desk not found');

    const menuItems = await this.prisma.menuItem.findMany({
      where: { tenantId: desk.tenantId, deleted: false },
      orderBy: { name: 'asc' },
    });

    return { desk, menuItems };
  }

  // Availability for time-slot picking.
  // Accepts either:
  //  - ?date=YYYY-MM-DD (local) OR
  //  - ?from=ISO&to=ISO
  @Get('desks/:id/availability')
  async availabilityForDesk(
    @Param('id') id: string,
    @Query('date') date?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const desk = await this.prisma.table.findFirst({ where: { id, deleted: false } });
    if (!desk) throw new NotFoundException('Desk not found');

    let rangeFrom: Date;
    let rangeTo: Date;

    if (from && to) {
      rangeFrom = new Date(from);
      rangeTo = new Date(to);
    } else {
      // Default to “today” if no date.
      const d = date ? new Date(`${date}T00:00:00`) : new Date();
      rangeFrom = new Date(d);
      rangeFrom.setHours(0, 0, 0, 0);
      rangeTo = new Date(rangeFrom);
      rangeTo.setDate(rangeTo.getDate() + 1);
    }

    const occupiedOrders = await this.prisma.order.findMany({
      where: {
        tenantId: desk.tenantId,
        tableId: desk.id,
        deleted: false,
        status: { notIn: [OrderStatus.CANCELLED] },
        // overlap: start < rangeTo AND (end ?? start) > rangeFrom
        startAt: { lt: rangeTo },
        OR: [{ endAt: null }, { endAt: { gt: rangeFrom } }],
      },
      select: { id: true, status: true, startAt: true, endAt: true },
      orderBy: { startAt: 'asc' },
    });

    const occupiedBookings = await this.prisma.booking.findMany({
      where: {
        tenantId: desk.tenantId,
        tableId: desk.id,
        deleted: false,
        status: { notIn: [BookingStatus.CANCELLED] },
        startAt: { lt: rangeTo },
        endAt: { gt: rangeFrom },
      },
      select: { id: true, status: true, startAt: true, endAt: true },
      orderBy: { startAt: 'asc' },
    });

    const occupied = [
      ...occupiedOrders.map((o) => ({ id: o.id, kind: 'order' as const, status: o.status, startAt: o.startAt, endAt: o.endAt })),
      ...occupiedBookings.map((b) => ({ id: b.id, kind: 'booking' as const, status: b.status, startAt: b.startAt, endAt: b.endAt })),
    ].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

    return { from: rangeFrom.toISOString(), to: rangeTo.toISOString(), occupied };
  }


  @Get('desks/:id/upcoming')
  async upcomingForDesk(@Param('id') id: string) {
    const desk = await this.prisma.table.findFirst({ where: { id, deleted: false } });
    if (!desk) throw new NotFoundException('Desk not found');

    const now = new Date();
    const upcoming = await this.prisma.order.findMany({
      where: {
        tenantId: desk.tenantId,
        tableId: desk.id,
        deleted: false,
        status: { notIn: [OrderStatus.CANCELLED, OrderStatus.COMPLETED] },
        startAt: { gt: now },
      },
      orderBy: { startAt: 'asc' },
      take: 10,
      include: { orderItems: { include: { menuItem: true } } },
    });

    return { upcoming };
  }

  @Get('orders/:id')
  async publicOrder(@Param('id') id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, deleted: false },
      include: {
        table: { select: { id: true, name: true, qrUrl: true, hourlyRate: true } },
        orderItems: { include: { menuItem: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

}
