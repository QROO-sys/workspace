import { Controller, Get, Param, NotFoundException, Query, BadRequestException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
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

  // Basic day-view availability for a desk (hourly grid can be built client-side)
  // Preferred: provide start/end as ISO strings (computed client-side in local timezone).
  // Fallback: date=YYYY-MM-DD (server interprets as UTC day).
  @Get('desks/:id/availability')
  async availabilityForDesk(
    @Param('id') id: string,
    @Query('date') date?: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    const desk = await this.prisma.table.findFirst({ where: { id, deleted: false } });
    if (!desk) throw new NotFoundException('Desk not found');

    let dayStart: Date;
    let dayEnd: Date;

    if (start && end) {
      dayStart = new Date(start);
      dayEnd = new Date(end);
      if (Number.isNaN(dayStart.getTime()) || Number.isNaN(dayEnd.getTime())) {
        throw new BadRequestException('Invalid start/end');
      }
    } else {
      if (!date) throw new BadRequestException('Missing date');
      // Accept YYYY-MM-DD
      dayStart = new Date(`${date}T00:00:00.000Z`);
      if (Number.isNaN(dayStart.getTime())) throw new BadRequestException('Invalid date');
      dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    }

    const bookings = await this.prisma.order.findMany({
      where: {
        tenantId: desk.tenantId,
        tableId: desk.id,
        deleted: false,
        status: { notIn: [OrderStatus.CANCELLED, OrderStatus.COMPLETED] },
        startAt: { lt: dayEnd },
        endAt: { gt: dayStart },
      },
      orderBy: { startAt: 'asc' },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        status: true,
        customerName: true,
      },
    });

    return { date: date || null, dayStart, dayEnd, bookings };
  }

}
